import { hasExpression, transformExpression } from 'compiler/parser/expression';
import { parseStyleText } from 'web/util/style';
import {
  getAndRemoveAttr,
  baseWarn,
} from 'compiler/helpers';

function transformNode(el) {
  const exp = getAndRemoveAttr(el, 'style');

  if (exp) {
    if (hasExpression(exp)) {
      el.styleBinding = transformExpression(exp);
    } else {
      el.staticStyle = JSON.stringify(parseStyleText(exp));
    }
  }
}

function genData(el) {
  let data = '';
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`;
  }
  if (el.styleBinding) {
    data += `style:(${el.styleBinding}),`;
  }
  return data;
}

export default {
  staticKeys: ['staticStyle'],
  transformNode,
  genData,
};
