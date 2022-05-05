import { parse } from './parser/index';
import { optimize } from './optimizer';
import { generate } from './codegen/index';
import { createCompilerCreator } from './create-compiler';

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator((template, options) => {
  // 生成template ast
  const ast = parse(template.trim(), options);

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
