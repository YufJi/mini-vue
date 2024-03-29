import { ASSET_TYPES } from 'shared/constants';

import config from '../config';
import builtInComponents from '../components/index';
import { initUse } from './use';
import { initMixin } from './mixin';
import { initExtend } from './extend';
import { initAssetRegisters } from './assets';

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
} from '../util/index';

export function initGlobalAPI(Vue) {
  // config
  const configDef = {};
  configDef.get = () => config;

  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.',
      );
    };
  }

  Object.defineProperty(Vue, 'config', configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
  };

  Vue.nextTick = nextTick;

  Vue.options = Object.create(null);
  ASSET_TYPES.forEach((type) => {
    Vue.options[`${type}s`] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object
  Vue.options._base = Vue;

  // 注册内置组件
  extend(Vue.options.components, builtInComponents);

  initUse(Vue);
  initMixin(Vue);
  initExtend(Vue);
  initAssetRegisters(Vue);
}
