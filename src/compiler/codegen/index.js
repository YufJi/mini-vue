import { camelize, no, extend } from 'shared/util';

import { baseWarn, pluckModuleFunction } from '../helpers';
import { emptySlotScopeToken } from '../parser/index';
import { genHandlers } from './events';

export class CodegenState {
  constructor(options) {
    this.options = options;
    this.warn = options.warn || baseWarn;
    this.transforms = pluckModuleFunction(options.modules, 'transformCode');
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData');
    const isReservedTag = options.isReservedTag || no;
    this.maybeComponent = (el) => !!el.component || !isReservedTag(el.tag);
    this.onceId = 0;
    this.staticRenderFns = [];

    this.header = [];
    this.importTplDeps = {};
    this.includeTplDeps = {};
    this.importIncludeIndex = 1;
  }
}

export function generate(
  ast,
  options,
) {
  const state = new CodegenState(options);
  // fix #11483, Root level <script> tags should not be rendered.
  const code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")';
  return {
    header: state.header,
    render: `with(this){ return ${code} }`,
    staticRenderFns: state.staticRenderFns,
  };
}

export function genElement(el, state) {
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state);
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state);
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state);
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state);
  } else if (el.tag === 'template') {
    return genTemplate(el, state);
  } else if (el.tag === 'slot') {
    return genSlot(el, state);
  } else if (el.tag === 'wxs') {
    return genWxs(el, state);
  } else {
    // component or element
    let code;
    let data;

    if (!el.plain) {
      data = genData(el, state);
    }

    const children = genChildren(el, state, true);
    code = `_c('${el.tag}'${data ? `,${data}` : ''}${children ? `,${children}` : ''})`;

    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code);
    }
    return code;
  }
}

// hoist static sub-trees out
function genStatic(el, state) {
  el.staticProcessed = true;
  state.staticRenderFns.push(`with(this){ return ${genElement(el, state)} }`);
  return `_m(${state.staticRenderFns.length - 1}${el.staticInFor ? ',true' : ''})`;
}

// v-once
function genOnce(el, state) {
  el.onceProcessed = true;
  if (el.if && !el.ifProcessed) {
    return genIf(el, state);
  } else if (el.staticInFor) {
    let key = '';
    let { parent } = el;
    while (parent) {
      if (parent.for) {
        key = parent.key;
        break;
      }
      parent = parent.parent;
    }
    if (!key) {
      process.env.NODE_ENV !== 'production' && state.warn(
        'v-once can only be used inside v-for that is keyed. ',
        el.rawAttrsMap['v-once'],
      );
      return genElement(el, state);
    }
    return `_o(${genElement(el, state)},${state.onceId++},${key})`;
  } else {
    return genStatic(el, state);
  }
}

export function genIf(
  el,
  state,
  altGen,
  altEmpty,
) {
  el.ifProcessed = true; // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty);
}

function genIfConditions(
  conditions,
  state,
  altGen,
  altEmpty,
) {
  if (!conditions.length) {
    return altEmpty || '_e()';
  }

  const condition = conditions.shift();
  if (condition.exp) {
    return `(${condition.exp})?${
      genTernaryExp(condition.block)
    }:${
      genIfConditions(conditions, state, altGen, altEmpty)
    }`;
  } else {
    return `${genTernaryExp(condition.block)}`;
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state);
  }
}

export function genFor(el, state, altGen, altHelper) {
  const exp = el.for;
  const { forItem, forIndex } = el;

  if (process.env.NODE_ENV !== 'production'
    && state.maybeComponent(el)
    && el.tag !== 'slot'
    && el.tag !== 'template'
    && !el.key
  ) {
    state.warn(
      `<${el.tag} v-for="${forItem} in ${exp}">: component lists rendered with `
      + 'v-for should have explicit keys. '
      + 'See https://vuejs.org/guide/list.html#key for more info.',
      el.rawAttrsMap['v-for'],
      true, /* tip */
    );
  }

  el.forProcessed = true; // avoid recursion
  return `${altHelper || '_l'}((${exp}),`
    + `function(${forItem},${forIndex}){`
      + `return ${(altGen || genElement)(el, state)}`
    + '})';
}

export function genData(el, state) {
  let data = '{';

  // key
  if (el.key) {
    data += `key:${el.key},`;
  }

  // record original tag name for components using "is" attribute
  if (el.component) {
    data += `tag:"${el.tag}",`;
  }
  // module data generation functions
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el);
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`;
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props)},`;
  }
  // event handlers
  if (el.events) {
    data += `${genHandlers(el.events)},`;
  }

  // slot target
  // only for non-scoped slots
  if (el.slotTarget) {
    data += `slot:${el.slotTarget},`;
  }

  // component v-model
  if (el.model) {
    data += `model:{value:${
      el.model.value
    },callback:${
      el.model.callback
    },expression:${
      el.model.expression
    }},`;
  }
  // inline-template
  if (el.inlineTemplate) {
    const inlineTemplate = genInlineTemplate(el, state);
    if (inlineTemplate) {
      data += `${inlineTemplate},`;
    }
  }
  data = `${data.replace(/,$/, '')}}`;
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.
  if (el.dynamicAttrs) {
    data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`;
  }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data);
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data);
  }
  return data;
}

function genInlineTemplate(el, state) {
  const ast = el.children[0];
  if (process.env.NODE_ENV !== 'production' && (
    el.children.length !== 1 || ast.type !== 1
  )) {
    state.warn(
      'Inline-template components must have exactly one child element.',
      { start: el.start },
    );
  }
  if (ast && ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options);
    return `inlineTemplate:{render:function(){${
      inlineRenderFns.render
    }},staticRenderFns:[${
      inlineRenderFns.staticRenderFns.map((code) => `function(){${code}}`).join(',')
    }]}`;
  }
}

export function genChildren(el, state, checkSkip, altGenElement, altGenNode) {
  const { children } = el;
  if (children.length) {
    const el = children[0];
    // optimize single v-for
    if (children.length === 1
      && el.for
      && el.tag !== 'template'
      && el.tag !== 'slot'
    ) {
      const normalizationType = checkSkip
        ? state.maybeComponent(el) ? ',1' : ',0'
        : '';
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`;
    }

    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0;
    const gen = altGenNode || genNode;
    return `[${children.map((c) => gen(c, state)).join(',')}]${
      normalizationType ? `,${normalizationType}` : ''
    }`;
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType(
  children,
  maybeComponent,
) {
  let res = 0;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    if (el.type !== 1) {
      continue;
    }
    if (needsNormalization(el)
        || (el.ifConditions && el.ifConditions.some((c) => needsNormalization(c.block)))) {
      res = 2;
      break;
    }
    if (maybeComponent(el)
        || (el.ifConditions && el.ifConditions.some((c) => maybeComponent(c.block)))) {
      res = 1;
    }
  }
  return res;
}

function needsNormalization(el) {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot';
}

function genNode(node, state) {
  if (node.type === 1) {
    return genElement(node, state);
  } else if (node.type === 3 && node.isComment) {
    return genComment(node);
  } else {
    return genText(node);
  }
}

export function genText(text) {
  return `_v(${text.type === 2
    ? text.expression // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))
  })`;
}

export function genComment(comment) {
  return `_e(${JSON.stringify(comment.text)})`;
}

function genSlot(el, state) {
  const slotName = el.slotName || '"default"';
  const children = genChildren(el, state);
  let res = `_t(${slotName}${children ? `,function(){return ${children}}` : ''}`;
  const attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map((attr) => ({
      // slot props are camelized
      name: camelize(attr.name),
      value: attr.value,
      dynamic: attr.dynamic,
    })))
    : null;
  const bind = el.attrsMap['v-bind'];
  if ((attrs || bind) && !children) {
    res += ',null';
  }
  if (attrs) {
    res += `,${attrs}`;
  }
  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`;
  }
  return `${res})`;
}

function genWxs(el, state) {
  const { src, module } = el;
  state.header.push(`const ${module} = require('${src}');`);

  return '_e()';
}

function genTemplate(el, state) {
  return '_e()';
}

function genProps(props) {
  let staticProps = '';
  let dynamicProps = '';
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const value = transformSpecialNewlines(prop.value);
    if (prop.dynamic) {
      dynamicProps += `${prop.name},${value},`;
    } else {
      staticProps += `"${prop.name}":${value},`;
    }
  }
  staticProps = `{${staticProps.slice(0, -1)}}`;
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`;
  } else {
    return staticProps;
  }
}

/* istanbul ignore next */
function generateValue(value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value);
  }
  return JSON.stringify(value);
}

// #3895, #4268
function transformSpecialNewlines(text) {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
