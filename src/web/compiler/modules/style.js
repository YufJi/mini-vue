import { hasExpression, transformExpression } from 'compiler/parser/expression-parser';
import { parseStyleText } from 'web/util/style';
import {
  getAndRemoveAttr,
  baseWarn,
} from 'compiler/helpers';

function transformNode(el) {
  const exp = getAndRemoveAttr(el, 'style');

  if (exp) {
    if (hasExpression(exp)) {
      el.styleBinding = exp;
    } else {
      el.staticStyle = JSON.stringify(parseStyleText(exp));
    }
  }
}

function genData(el, state) {
  let data = '';
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`;
  }
  if (el.styleBinding) {
    data += `style:(${transformExpression(el.styleBinding, state.scope)}),`;
  }
  return data;
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData,
};
