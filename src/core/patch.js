import { createPatchFunction } from './vdom/patch';
import modules from './vdom/modules/index';
import * as nodeOps from './node-ops';

export const patch = createPatchFunction({ nodeOps, modules });
