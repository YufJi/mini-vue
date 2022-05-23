import { camelize, no, extend } from 'shared/util';

import { baseWarn, pluckModuleFunction } from '../helpers';
import { transformExpression } from '../parser/expression-parser';
import { emptySlotScopeToken } from '../parser/index';
import { transformText } from '../parser/text-parser';
import { genHandlers } from './events';

export class CodegenState {
  constructor(options) {
    this.options = options;
    this.warn = options.warn || baseWarn;
    this.transforms = pluckModuleFunction(options.modules, 'transformCode');
    this.dataGenFns = pluckModuleFunction(options.modules, 'genData');
    const isReservedTag = options.isReservedTag || no;
    this.maybeComponent = (el) => !isReservedTag(el.tag);
    this.onceId = 0;
    this.staticRenderFns = [];

    // 引入的wxs
    this.wxs = [];
    // 存储自己定义的template
    this.innerTpls = {};
    // 存储import的template
    this.importTplDeps = [];
    // 存储include的template
    this.includeTplDeps = {};
    this.importIdx = 1;
    this.includeIdx = 1;

    this.rootScope = makeScope();
    this.scope = [this.rootScope];
  }
}

function makeScope(content) {
  if (content) {
    return Object.assign(Object.create(null), content);
  } else {
    return Object.create(null);
  }
}

const genRenderFn = (code) => `function(_a, _x) {
  const _c = _x._self._c || _x.$createElement;
  const { _n, _s, _l, _t, _m, _v, _e, $getWxsMember, $getLooseDataMember, $renderTemplate } = _x;

  return ${code}
}`;

export function generate(
  ast,
  options,
) {
  const state = new CodegenState(options);
  // fix #11483, Root level <script> tags should not be rendered.
  const code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")';

  const header = [
    'export const $innerTemplates = {};',
  ];

  // 生成innerTpl
  Object.keys(state.innerTpls).forEach((key) => {
    const renderFn = state.innerTpls[key];
    const code = `$innerTemplates['${key}'] = ${renderFn}`;
    header.push(code);
  });

  header.push('const $templates = Object.assign({},');
  // import
  state.importTplDeps.forEach((item) => {
    header.push(`require("${item}").$innerTemplates,`);
  });
  header.push('$innerTemplates');
  header.push(');');

  // include

  // 生成wxs
  state.wxs.forEach((item) => {
    header.unshift(item);
  });

  return {
    header,
    render: genRenderFn(code),
    staticRenderFns: state.staticRenderFns,
  };
}

export function genElement(el, state) {
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state);
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state);
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state);
  } else if (el.tag === 'template') {
    return genTemplate(el, state);
  } else if (el.tag === 'import') {
    return genImport(el, state);
  } else if (el.tag === 'include') {
    return genInclude(el, state);
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
  state.staticRenderFns.push(genRenderFn(genElement(el, state)));
  return `_m(${state.staticRenderFns.length - 1}${el.staticInFor ? ',true' : ''})`;
}

export function genIf(el, state, altGen, altEmpty) {
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
    return `(${transformExpression(condition.exp, state.scope)})?${
      genTernaryExp(condition.block)
    }:${
      genIfConditions(conditions, state, altGen, altEmpty)
    }`;
  } else {
    return `${genTernaryExp(condition.block)}`;
  }

  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : genElement(el, state);
  }
}

export function genFor(el, state, altGen, altHelper) {
  const exp = transformExpression(el.for, state.scope);
  const { forItem, forIndex } = el;

  if (process.env.NODE_ENV !== 'production'
    && state.maybeComponent(el)
    && el.tag !== 'slot'
    && el.tag !== 'template'
    && !el.key
  ) {
    state.warn(
      `<${el.tag} wx:for="{{${exp}}}" wx:for-item="${forItem}">: component lists rendered with `
      + 'wx:for should have explicit keys. '
      + 'See https://vuejs.org/guide/list.html#key for more info.',
      el.rawAttrsMap['wx:for'],
      true, /* tip */
    );
  }

  el.forProcessed = true; // avoid recursion

  state.scope.push(makeScope({
    [forItem]: true,
    [forIndex]: true,
  }));

  const code = `${altHelper || '_l'}((${exp}),`
    + `function(${forItem},${forIndex}){`
      + `return ${(altGen || genElement)(el, state)}`
    + '})';

  if (state.scope.length > 1) {
    state.scope.pop();
  }

  return code;
}

export function genData(el, state) {
  let data = '{';

  // key
  if (el.key) {
    // data += `key: ${transformExpression(el.key, state.scope)},`;
    data += `key: ${el.key},`;
  }

  // module data generation functions
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el, state);
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs, state)},`;
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props, state)},`;
  }

  // event handlers
  if (el.events) {
    data += `${genHandlers(el.events, state)},`;
  }

  // slot target
  // only for non-scoped slots
  if (el.slotTarget) {
    data += `slot: ${transformExpression(el.slotTarget, state.scope)},`;
  }

  data = `${data.replace(/,$/, '')}}`;

  return data;
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
function getNormalizationType(children, maybeComponent) {
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
    return genText(node, state);
  }
}

export function genText(text, state) {
  return `_v(${text.type === 2
    ? transformText(text.expression, state.scope) // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))
  })`;
}

export function genComment(comment) {
  return `_e(${JSON.stringify(comment.text)})`;
}

function genSlot(el, state) {
  const slotName = transformExpression(el.slotName);
  const children = genChildren(el, state);
  let res = `_t(_x, ${slotName}${children ? `,function(){return ${children}}` : ''}`;
  const attrs = el.attrs
    ? genProps((el.attrs || []).map((attr) => ({
      // slot props are camelized
      name: camelize(attr.name),
      value: attr.value,
    })))
    : null;

  if ((attrs) && !children) {
    res += ',null';
  }
  if (attrs) {
    res += `,${attrs}`;
  }

  return `${res})`;
}

function genWxs(el, state) {
  const { src, module } = el;

  if (src && module) {
    state.wxs.push(`import ${module} from '${src}';`);
    state.rootScope[module] = 'wxs';
  }

  return '_e()';
}

function genTemplate(el, state) {
  let exp;
  if (exp = el.templateIs) {
    const is = transformExpression(exp, state.scope);
    const data = (exp = el.templateData) ? transformExpression(exp = el.templateData, state.scope, { forceObject: true }) : '{}';

    return `$renderTemplate($templates[${is}], ${data}, _x)`;
  } else if (el.templateDefine) {
    // 拿到children
    const children = genChildren(el, state, true);
    const code = `_c('fragment'${children ? `,${children}` : ''})`;

    state.innerTpls[el.templateDefine] = genRenderFn(code);

    return '_e()';
  }
}

function genImport(el, state) {
  if (el.src) {
    state.importTplDeps.push(el.src);
  }

  return '_e()';
}

function genInclude(el, state) {
  return '_e()';
}

function genProps(props, state) {
  let staticProps = '';

  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const value = transformExpression(prop.value, state.scope);
    staticProps += `"${prop.name}":${value},`;
  }

  staticProps = `{${staticProps.slice(0, -1)}}`;

  return staticProps;
}

// #3895, #4268
function transformSpecialNewlines(text) {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
