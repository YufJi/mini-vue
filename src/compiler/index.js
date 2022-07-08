import { parse } from './parser/index';
import { optimize } from './optimizer';
import { generate } from './codegen/index';
import { createCompilerCreator } from './create-compiler';
import { baseOptions } from './options';

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
const createCompiler = createCompilerCreator((template, options) => {
  // 生成template ast
  const ast = parse(`<block>${template}</block>`, options);

  // 优化
  if (options.optimize !== false) {
    optimize(ast, options);
  }

  // 生成code
  const code = generate(ast, options);

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
    header: code.header,
  };
});

const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
