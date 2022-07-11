// 文本需要toString

import { transformExpressionByPart } from './expression-parser';

export function transformText(str, scope, config = {}) {
  const ret = transformExpressionByPart(str, scope, config);

  return ret.map((item) => `$toString(${item})`).join(' + ');
}
