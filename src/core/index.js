import {
  extend,
  noop,
  query,
} from 'shared/util/index';
import Vue from './instance/index';
import { mountComponent } from './instance/lifecycle';
import { createPatchFunction } from './vdom/patch';
import modules from './vdom/modules/index';

import { initGlobalAPI } from './global-api/index';
import { devtools, inBrowser } from './util/index';
import * as nodeOps from './node-ops';
import config from './config';

// Vue.options以及一些全局api
initGlobalAPI(Vue);

Vue.version = '__VERSION__';

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? createPatchFunction({ modules, nodeOps }) : noop;

// public mount method
Vue.prototype.$mount = function (el) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el);
};

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue);
      } else if (
        process.env.NODE_ENV !== 'production'
        && process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n'
          + 'https://github.com/vuejs/vue-devtools',
        );
      }
    }
    if (process.env.NODE_ENV !== 'production'
      && process.env.NODE_ENV !== 'test'
      && config.productionTip !== false
      && typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        'You are running Vue in development mode.\n'
        + 'Make sure to turn on production mode when deploying for production.\n'
        + 'See more tips at https://vuejs.org/guide/deployment.html',
      );
    }
  }, 0);
}

export default Vue;
