import { createCompiler } from './create-compiler';
import { baseOptions } from './options';

const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
