const transpile = require('vue-template-es2015-compiler');
const compiler = require('../dist/vue-template-compiler');

module.exports = function (source) {
  const result = compiler.compile(wrapSourceTemplate(source));

  const { header = [], render, staticRenderFns } = result;

  console.log('header', header);
  const code = transpile(
    `${header.join('\n')}\n`
     + `var render = ${toFunction(render)}\n`
     + `var staticRenderFns = [${staticRenderFns.map(toFunction)}]\n`,
  );

  return `${code}
          export { render, staticRenderFns }
          `;
};

function wrapSourceTemplate(template) {
  return `<block>${template}</block>`;
}

function toFunction(code) {
  return `function () {${code}}`;
}
