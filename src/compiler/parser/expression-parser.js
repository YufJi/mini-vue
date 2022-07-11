import parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import t from '@babel/types';

export const fullExpressionTagReg = /^\{\{([^`{}]+)\}\}$/;
export const expressionTagReg = /\{\{([^`{}]+)\}\}/g;

function escapeString(str) {
  return str.replace(/[\\']/g, '\\$&')
    .replace(/[\r\n]/g, '');
}

export function hasExpression(str = '') {
  return str.match(expressionTagReg);
}

export function transformExpression(str, scope, config = {}) {
  const ret = transformExpressionByPart(str, scope, config);

  return ret.join(' + ');
}

export function transformExpressionByPart(str, scope, config) {
  str = str.trim();
  // 非表达式
  if (!str.match(expressionTagReg)) {
    return [`"${escapeString(str)}"`];
  }

  let match = str.match(fullExpressionTagReg);
  if (match) {
    return [transformCode(match[1], scope, config)];
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

    // 变量
    gen.push(transformCode(code, scope, config));

    lastIndex = expressionTagReg.lastIndex;
  }

  if (lastIndex < totalLength) {
    gen.push(`"${escapeString(str.slice(lastIndex))}"`);
  }

  return gen;
}

const visitor = {
  noScope: true,
  ReferencedIdentifier(path) {
    const { parent, node } = path;

    if (node.__xmlSkipped) {
      return;
    }

    const nameScope = findScope(this.xmlScope, node.name);

    if (!nameScope) {
      node.name = `_a['${node.name}']`;
    } else if (nameScope === 'wxs') {
      const parentType = parent && parent.type;
      if (node.type === 'Identifier' && !(parentType === 'MemberExpression' && parent.object === node)) {
        const args = [t.arrayExpression([node])];
        if (parentType === 'CallExpression' && parent.callee === node) {
          args.push(t.numericLiteral(1));
        }
        const newNode = t.callExpression(t.identifier('$getWxsMember'), args);
        newNode.callee.__xmlSkipped = true;
        path.replaceWith(newNode);
        path.skip();
      }
    }
  },
  MemberExpression(path) {
    const { parent, node } = path;

    const parentType = parent && parent.type;
    // do not transform function call
    // skip call callee x[y.q]
    /* root member node */
    if (parentType !== 'MemberExpression') {
      // allow {{x.y.z}} even x is undefined
      const members = [node];
      let root = node.object;

      while (root.type === 'MemberExpression') {
        members.push(root);
        root = root.object;
      }

      const isSJS = findScope(this.xmlScope, root.name) === 'wxs';

      if (!isSJS && this.strictDataMember) {
        return;
      }

      // TODO. use https://www.npmjs.com/package/babel-plugin-transform-optional-chaining
      const memberFn = isSJS ? '$getWxsMember' : '$getLooseDataMember';
      members.reverse();
      const args = [root];

      if (isSJS) {
        root.__xmlSkipped = true;
      }

      if (root.type === 'ThisExpression') {
        args.pop();
        args.push(members.shift());
      }

      if (!members.length) {
        return;
      }

      members.forEach((m) => {
        // x[y]
        if (m.computed) {
          args.push(m.property);
        } else {
          // x.y
          args.push(t.stringLiteral(m.property.name));
        }
      });

      const callArgs = [t.arrayExpression(args)];
      if (parent.callee === node) {
        callArgs.push(t.numericLiteral(1));
      }

      const newNode = t.callExpression(t.identifier(memberFn), callArgs);
      newNode.callee.__xmlSkipped = true;
      // will process a.v of x.y[a.v]
      path.replaceWith(newNode);
      // path.skip();
    }
  },
};

const babylonConfig = {
  plugins: ['objectRestSpread'],
};

function transformCode(exp, xmlScope, config) {
  let codeStr = exp;

  if (config.forceObject) {
    codeStr = `{${codeStr}}`;
  }

  const expression = parser.parseExpression(codeStr, babylonConfig);
  const { start, end } = expression;
  const ast = {
    type: 'File',
    start,
    end,
    program: {
      start,
      end,
      type: 'Program',
      body: [{
        start,
        end,
        type: 'ExpressionStatement',
        expression,
      }],
    },
  };

  traverse(ast, visitor, undefined, {
    xmlScope,
    strictDataMember: !!config.strictDataMember,
  });

  let code;

  try {
    code = generate(ast).code;
  } catch (error) {
    console.log('生成code出错：', error);
  }

  if (code.charAt(code.length - 1) === ';') {
    code = code.slice(0, -1);
  }

  return `${code}`;
}

function findScope(scope, name) {
  if (scope) {
    let result = false;

    for (let i = scope.length - 1; i > -1; i--) {
      const item = scope[i];
      if (item[name]) {
        result = item[name];
        break;
      }
    }

    return result;
  }

  return false;
}
