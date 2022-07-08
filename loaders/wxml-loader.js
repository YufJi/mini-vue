const compiler = require('../dist/vue-template-compiler');

module.exports = function (source) {
  const result = compiler.compile(source);

  const { header = [], render, staticRenderFns } = result;

  let code = `${header.join('\n')}\n`
     + `var render = ${render}\n`
     + `var staticRenderFns = [${staticRenderFns}]\n`
     + 'export { render, staticRenderFns }\n';

  if (this.mode === 'development') {
    const { resourcePath } = this;
    code += `console.log(${JSON.stringify(resourcePath)})\n`
          + `console.log(${JSON.stringify(code)})`;
  }

  return code;
};
