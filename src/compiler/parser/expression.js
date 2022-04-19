// not allow {{x:{y:1}}}
// or use complex parser

const fullExpressionTagReg = /^\{\{([^`{}]+)\}\}$/;
const expressionTagReg = /\{\{([^`{}]+)\}\}/g;

const spreadReg = /^\.\.\.[\w$_][\w$_\d]*/; // ...abc
const objReg = /^[\w$_][\w$_\d]*\s*:\s*[\w$_][\w$_\d]*/; // name: abc
const es2015ObjReg = /^[\w$_][\w$_\d]*/; // abc

function escapeString(str) {
  return str.replace(/[\\']/g, '\\$&');
}

export function hasExpression(str = '') {
  return str.match(expressionTagReg);
}

export function transformExpression(str) {
  if (!str.match(expressionTagReg)) {
    return `"${str}"`;
  }

  let match = str.match(fullExpressionTagReg);

  if (match) {
    return match[1];
  }

  const totalLength = str.length;
  let lastIndex = 0;
  const gen = [];
  /* eslint no-cond-assign:0 */
  while (match = expressionTagReg.exec(str)) {
    const code = match[1];

    if (match.index !== lastIndex) {
      gen.push(`"${escapeString(str.slice(lastIndex, match.index))}"`);
    }
    gen.push(code);

    lastIndex = expressionTagReg.lastIndex;
  }

  if (lastIndex < totalLength) {
    gen.push(`"${escapeString(str.slice(lastIndex))}"`);
  }

  return gen.join(' + ');
}
