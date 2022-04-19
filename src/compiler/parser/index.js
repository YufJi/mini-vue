import he from 'he';
import { extend, cached, no, camelize, hyphenate } from 'shared/util';
import { isEdge } from 'core/util/env';

// import { genAssignmentCode } from '../directives/model';
import {
  addProp,
  addAttr,
  baseWarn,
  addHandler,
  getAndRemoveAttr,
  getRawBindingAttr,
  pluckModuleFunction,
} from '../helpers';
import { parseHTML } from './html-parser';
import { parseText } from './text-parser';
import { hasExpression, transformExpression } from './expression';

export const onRE = /^@|^v-on:/;
// 指令正则
export const dirRE = /^v-|^@|^:|^#/;

const argRE = /:(.*)$/;
export const bindRE = /^:|^\.|^v-bind:/;
const modifierRE = /\.[^.\]]+(?=[^\]]*$)/g;

const lineBreakRE = /[\r\n]/;
const whitespaceRE = /[ \f\t\r\n]+/g;

const invalidAttributeRE = /[\s"'<>\/=]/;

const variableRE = /^[$\w]+$/;
const forKeyRE = /^[\w.$]+$/;
const eventRE = /^(capture-)?(bind|catch):?([A-Za-z_]+)$/;

const decodeHTMLCached = cached(he.decode);

export const emptySlotScopeToken = '_empty_';

// configurable state
export let warn;

let delimiters;
let transforms;
let preTransforms;
let postTransforms;
let platformIsPreTag;
let platformMustUseProp;
let platformGetTagNamespace;

export function createASTElement(tag, attrs, parent) {
  return {
    type: 1,
    tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent,
    children: [],
  };
}

/**
 * Convert HTML string to AST.
 */
export function parse(template, options) {
  warn = options.warn || baseWarn;

  platformIsPreTag = options.isPreTag || no;
  platformMustUseProp = options.mustUseProp || no;
  platformGetTagNamespace = options.getTagNamespace || no;

  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
  transforms = pluckModuleFunction(options.modules, 'transformNode');
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');

  delimiters = options.delimiters;

  // 头部引用相关
  const header = [];
  const stack = [];
  const preserveWhitespace = options.preserveWhitespace !== false;
  const whitespaceOption = options.whitespace;
  let root;
  let currentParent;
  let inPre = false;
  let warned = false;

  function warnOnce(msg, range) {
    if (!warned) {
      warned = true;
      warn(msg, range);
    }
  }

  // 元素闭合
  function closeElement(element) {
    trimEndingWhitespace(element);
    if (!element.processed) {
      element = processElement(element, options);
    }
    // tree management
    if (!stack.length && element !== root) {
      // allow root elements with v-if, v-else-if and v-else
      if (root.if && (element.elseif || element.else)) {
        if (process.env.NODE_ENV !== 'production') {
          checkRootConstraints(element);
        }
        addIfCondition(root, {
          exp: element.elseif,
          block: element,
        });
      } else if (process.env.NODE_ENV !== 'production') {
        warnOnce(
          'Component template should contain exactly one root element. '
          + 'If you are using v-if on multiple elements, '
          + 'use v-else-if to chain them instead.',
          { start: element.start },
        );
      }
    }
    if (currentParent && !element.forbidden) {
      if (element.elseif || element.else) {
        processIfConditions(element, currentParent);
      } else {
        if (element.slotScope) {
          // scoped slot
          // keep it in the children list so that v-else(-if) conditions can
          // find it as the prev node.
          const name = element.slotTarget || '"default"';
          (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
        }
        currentParent.children.push(element);
        element.parent = currentParent;
      }
    }

    // final children cleanup
    // filter out scoped slots
    element.children = element.children.filter((c) => !(c).slotScope);
    // remove trailing whitespace node again
    trimEndingWhitespace(element);

    if (platformIsPreTag(element.tag)) {
      inPre = false;
    }
    // apply post-transforms
    for (let i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options);
    }
  }

  function trimEndingWhitespace(el) {
    // remove trailing whitespace node
    if (!inPre) {
      let lastNode;
      while (
        (lastNode = el.children[el.children.length - 1])
        && lastNode.type === 3
        && lastNode.text === ' '
      ) {
        el.children.pop();
      }
    }
  }

  function checkRootConstraints(el) {
    if (el.tag === 'slot' || el.tag === 'template') {
      warnOnce(
        `Cannot use <${el.tag}> as component root element because it may `
        + 'contain multiple nodes.',
        { start: el.start },
      );
    }
    if (el.attrsMap.hasOwnProperty('v-for')) {
      warnOnce(
        'Cannot use v-for on stateful component root element because '
        + 'it renders multiple elements.',
        el.rawAttrsMap['v-for'],
      );
    }
  }

  // 解析template
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    start(tag, attrs, unary, start, end) {
      // check namespace.
      // inherit parent ns if there is one
      const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

      let element = createASTElement(tag, attrs, currentParent);
      if (ns) {
        element.ns = ns;
      }

      if (process.env.NODE_ENV !== 'production') {
        if (options.outputSourceRange) {
          element.start = start;
          element.end = end;
          element.rawAttrsMap = element.attrsList.reduce((cumulated, attr) => {
            cumulated[attr.name] = attr;
            return cumulated;
          }, {});
        }
        attrs.forEach((attr) => {
          if (invalidAttributeRE.test(attr.name)) {
            warn(
              'Invalid dynamic argument expression: attribute names cannot contain '
              + 'spaces, quotes, <, >, / or =.',
              {
                start: attr.start + attr.name.indexOf('['),
                end: attr.start + attr.name.length,
              },
            );
          }
        });
      }

      if (isForbiddenTag(element)) {
        element.forbidden = true;
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the '
          + 'UI. Avoid placing tags with side-effects in your templates, such as '
          + `<${tag}>` + ', as they will not be parsed.',
          { start: element.start },
        );
      }

      // 属性是否有绑定
      for (let i = 0; i < element.attrsList.length; i++) {
        const { value } = element.attrsList[i];

        if (hasExpression(value)) {
          element.hasBindings = true;
          break;
        }
      }

      // apply pre-transforms
      for (let i = 0; i < preTransforms.length; i++) {
        element = preTransforms[i](element, options) || element;
      }

      if (platformIsPreTag(element.tag)) {
        inPre = true;
      }

      if (!element.processed) {
        // structural directives
        processFor(element);
        processIf(element);
      }

      if (!root) {
        root = element;
        if (process.env.NODE_ENV !== 'production') {
          checkRootConstraints(root);
        }
      }

      if (!unary) {
        currentParent = element;
        stack.push(element);
      } else {
        closeElement(element);
      }
    },

    end(tag, start, end) {
      const element = stack[stack.length - 1];
      // pop stack
      stack.length -= 1;
      currentParent = stack[stack.length - 1];
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end;
      }
      closeElement(element);
    },

    chars(text, start, end) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.',
              { start },
            );
          } else if ((text = text.trim())) {
            warnOnce(
              `text "${text}" outside root element will be ignored.`,
              { start },
            );
          }
        }
        return;
      }

      const { children } = currentParent;
      if (inPre || text.trim()) {
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
      } else if (!children.length) {
        // remove the whitespace-only node right after an opening tag
        text = '';
      } else if (whitespaceOption) {
        if (whitespaceOption === 'condense') {
          // in condense mode, remove the whitespace node if it contains
          // line break, otherwise condense to a single space
          text = lineBreakRE.test(text) ? '' : ' ';
        } else {
          text = ' ';
        }
      } else {
        text = preserveWhitespace ? ' ' : '';
      }
      if (text) {
        if (!inPre && whitespaceOption === 'condense') {
          // condense consecutive whitespaces into single space
          text = text.replace(whitespaceRE, ' ');
        }
        let res;
        let child;
        if (text !== ' ' && (res = parseText(text))) {
          child = {
            type: 2,
            expression: res.expression,
            text,
          };
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          child = {
            type: 3,
            text,
          };
        }
        if (child) {
          if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
            child.start = start;
            child.end = end;
          }
          children.push(child);
        }
      }
    },
    comment(text, start, end) {
      // adding anything as a sibling to the root node is forbidden
      // comments should still be allowed, but ignored
      if (currentParent) {
        const child = {
          type: 3,
          text,
          isComment: true,
        };
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          child.start = start;
          child.end = end;
        }
        currentParent.children.push(child);
      }
    },
  });
  return root;
}

export function processElement(element, options) {
  // determine whether this is a plain element after
  // removing structural attributes
  element.plain = (
    !element.key
    && !element.scopedSlots
    && !element.attrsList.length
  );

  processSlotContent(element);
  processSlotOutlet(element);
  processComponent(element);
  // apply transforms
  for (let i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element;
  }
  processAttrs(element);
  return element;
}

export function processFor(el) {
  let exp;

  // wx:for
  if ((exp = getAndRemoveAttr(el, 'wx:for'))) {
    const res = transformExpression(exp);
    if (res) {
      el.for = res;
      el.forItem = 'item';
      el.forIndex = 'index';
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid wx:for expression: ${exp}`,
        el.rawAttrsMap['wx:for'],
      );
    }
  }

  // wx:for-item
  if ((exp = getAndRemoveAttr(el, 'wx:for-item'))) {
    if (exp.match(variableRE)) {
      el.forItem = exp;
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid wx:for-item expression: ${exp}`,
        el.rawAttrsMap['wx:for-item'],
      );
    }
  }

  // wx:for-index
  if ((exp = getAndRemoveAttr(el, 'wx:for-index'))) {
    if (exp.match(variableRE)) {
      el.forIndex = exp;
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid wx:for-index expression: ${exp}`,
        el.rawAttrsMap['wx:for-index'],
      );
    }
  }

  // wx:key
  if (el.for && (exp = getAndRemoveAttr(el, 'wx:key'))) {
    if (exp === '*this' || exp.match(forKeyRE)) {
      el.key = exp === '*this' ? el.forItem : `${el.forItem}.${exp}`;
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `Invalid wx:key expression: ${exp}`,
        el.rawAttrsMap['wx:key'],
      );
    }
  }
}

function processIf(el) {
  const exp = getAndRemoveAttr(el, 'wx:if');

  if (exp) {
    el.if = transformExpression(exp);
    addIfCondition(el, {
      exp: el.if,
      block: el,
    });
  } else {
    if (getAndRemoveAttr(el, 'wx:else') != null) {
      el.else = true;
    }
    const elseif = getAndRemoveAttr(el, 'wx:elseif');
    if (elseif) {
      el.elseif = transformExpression(elseif);
    }
  }
}

function processIfConditions(el, parent) {
  const prev = findPrevElement(parent.children);
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif,
      block: el,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `v-${el.elseif ? (`else-if="${el.elseif}"`) : 'else'} `
      + `used on element <${el.tag}> without corresponding v-if.`,
      el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else'],
    );
  }
}

function findPrevElement(children) {
  let i = children.length;
  while (i--) {
    if (children[i].type === 1) {
      return children[i];
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) `
          + 'will be ignored.',
          children[i],
        );
      }
      children.pop();
    }
  }
}

export function addIfCondition(el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}

// handle content being passed to a component as slot,
// e.g. <template slot="xxx">, <div slot-scope="xxx">
function processSlotContent(el) {
  let slotScope;
  if (el.tag === 'template') {
    slotScope = getAndRemoveAttr(el, 'scope');
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && slotScope) {
      warn(
        'the "scope" attribute for scoped slots have been deprecated and '
        + 'replaced by "slot-scope" since 2.5. The new "slot-scope" attribute '
        + 'can also be used on plain elements in addition to <template> to '
        + 'denote scoped slots.',
        el.rawAttrsMap.scope,
        true,
      );
    }
    el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope');
  } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
      warn(
        `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> `
        + '(v-for takes higher priority). Use a wrapper <template> for the '
        + 'scoped slot to make it clearer.',
        el.rawAttrsMap['slot-scope'],
        true,
      );
    }
    el.slotScope = slotScope;
  }

  // slot="xxx"
  const exp = getAndRemoveAttr(el, 'slot');
  if (exp) {
    const slotTarget = transformExpression(exp);
    if (hasExpression(exp)) {
      el.slotTargetDynamic = true;
    } else {
      el.slotTarget = exp === '""' ? '"default"' : slotTarget;
    }

    // preserve slot as an attribute for native shadow DOM compat
    // only for non-scoped slots.
    if (el.tag !== 'template' && !el.slotScope) {
      addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'));
    }
  }
}

// handle <slot/> outlets
function processSlotOutlet(el) {
  if (el.tag === 'slot') {
    const exp = getAndRemoveAttr(el, 'name');
    el.slotName = exp && transformExpression(exp);
    // slot不支持for
    delete el.for;
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        '`key` does not work on <slot> because slots are abstract outlets '
        + 'and can possibly expand into multiple elements. '
        + 'Use the key on a wrapping element instead.',
        getRawBindingAttr(el, 'key'),
      );
    }
  }
}

function processComponent(el) {
  let exp;
  if ((exp = getAndRemoveAttr(el, 'is'))) {
    el.component = exp;
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true;
  }
}

// 处理属性
function processAttrs(el) {
  const list = el.attrsList;
  let i;
  let l;
  let name;
  let rawName;
  let value;
  let syncGen;

  for (i = 0, l = list.length; i < l; i++) {
    // 属性名
    name = rawName = list[i].name;
    // 属性值
    value = list[i].value;

    // 事件绑定
    if (eventRE.test(name)) {
      const match = name.match(eventRE);
      const capture = !!match[1];
      const stop = match[2] === 'catch';
      const eventName = match[3];

      const modifiers = {};

      if (stop) {
        modifiers.stop = stop;
      }

      if (capture) {
        modifiers.capture = capture;
      }
      addHandler(el, eventName, transformExpression(value), modifiers, false, warn, list[i]);
    } else {
      addAttr(el, name, transformExpression(value), list[i]);
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component
          && name === 'muted'
          && platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true', list[i]);
      }
    }
  }
}

function makeAttrsMap(attrs) {
  const map = {};
  for (let i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production'
      && map[attrs[i].name] && !isEdge
    ) {
      warn(`duplicate attribute: ${attrs[i].name}`, attrs[i]);
    }
    map[attrs[i].name] = attrs[i].value;
  }
  return map;
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag(el) {
  return el.tag === 'script' || el.tag === 'style';
}

function isForbiddenTag(el) {
  return (
    el.tag === 'style'
    || (el.tag === 'script' && (
      !el.attrsMap.type
      || el.attrsMap.type === 'text/javascript'
    ))
  );
}
