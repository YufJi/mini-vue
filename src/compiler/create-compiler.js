import { createCompileToFunctionFn } from './to-function';

export function createCompilerCreator(baseCompile) {
  return function createCompiler(baseOptions) {
    // 调用时执行函数
    function compile(template, options) {
      const finalOptions = Object.create(baseOptions);
      const errors = [];
      const tips = [];

      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg);
      };

      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length;

          warn = (msg, range, tip) => {
            const data = { msg };
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength;
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength;
              }
            }
            (tip ? tips : errors).push(data);
          };
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules = (baseOptions.modules || []).concat(options.modules);
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules') {
            finalOptions[key] = options[key];
          }
        }
      }

      finalOptions.warn = warn;

      const compiled = baseCompile(template.trim(), finalOptions);
      compiled.errors = errors;
      compiled.tips = tips;
      return compiled;
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile),
    };
  };
}
