import { hasExpression, transformExpression } from 'compiler/parser/expression-parser';

import {
  getAndRemoveAttr,
  baseWarn,
} from 'compiler/helpers';

function transformNode(el) {
  const exp = getAndRemoveAttr(el, 'class');

  if (exp) {
    if (hasExpression(exp)) {
      el.classBinding = exp;
    } else {
      el.staticClass = JSON.stringify(exp.replace(/\s+/g, ' ').trim());
    }
  }
}

function genData(el, state) {
  let data = '';
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`;
  }
  if (el.classBinding) {
    data += `class:${transformExpression(el.classBinding, state.scope)},`;
  }
  return data;
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData,
};
