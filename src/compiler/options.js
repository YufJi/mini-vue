import {
  genStaticKeys,
  isPreTag,
  isReservedTag,
  getTagNamespace,
} from 'shared/util/index';

import modules from './modules/index';
import { isUnaryTag, canBeLeftOpenTag } from './util';

export const baseOptions = {
  expectHTML: true,
  modules,
  isPreTag,
  isUnaryTag,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules),
};
