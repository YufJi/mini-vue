import { hasExpression, transformExpression } from 'compiler/parser/expression';

import {
  getAndRemoveAttr,
  baseWarn,
} from 'compiler/helpers';

function transformNode(el) {
  const exp = getAndRemoveAttr(el, 'class');

  if (exp) {
    if (hasExpression(exp)) {
      el.classBinding = transformExpression(exp);
    } else {
      el.staticClass = JSON.stringify(exp.replace(/\s+/g, ' ').trim());
    }
  }
}

function genData(el) {
  let data = '';
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`;
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`;
  }
  return data;
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData,
};
