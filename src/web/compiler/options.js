import { genStaticKeys } from 'shared/util';
import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace,
} from '../util/index';

import modules from './modules/index';
import { isUnaryTag, canBeLeftOpenTag } from './util';

export const baseOptions = {
  expectHTML: true,
  modules,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules),
};
