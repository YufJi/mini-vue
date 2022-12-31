import { initMixin } from './init';
import { stateMixin } from './state';
import { renderMixin } from './render';
import { eventsMixin } from './events';
import { lifecycleMixin } from './lifecycle';
import { warn } from '../util/index';

function Vue(options) {
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);
}

// _init
initMixin(Vue);
// setData
stateMixin(Vue);
// $eventBinder
eventsMixin(Vue);
// _updateComponent _update
lifecycleMixin(Vue);
// _render
renderMixin(Vue);

export default Vue;
