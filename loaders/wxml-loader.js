const compiler = require('../dist/vue-template-compiler');

module.exports = function (source) {
  const result = compiler.compile(wrapSourceTemplate(source));

  const { header = [], render, staticRenderFns } = result;

  const code = `${header.join('\n')}\n`
     + `var render = ${render}\n`
     + `var staticRenderFns = [${staticRenderFns}]\n`;

  return `${code}
          export { render, staticRenderFns }
          `;
};

// 方便模板解析
function wrapSourceTemplate(template) {
  return `<block>${template}</block>`;
}
