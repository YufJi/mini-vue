import { add, remove } from '../vdom/modules/events';

export function eventsMixin(Vue) {
  Vue.prototype.$on = function (event, fn) {
    const vm = this;

    vm.$el && add(vm.$el, event, fn);
  };

  Vue.prototype.$off = function (event, fn) {
    const vm = this;

    vm.$el && remove(vm.$el, event, fn);
  };

  Vue.prototype.$emit = function (event) {
    const vm = this;

    vm.$el && vm.$el.dispatchEvent(event);
  };

  Vue.prototype.$eventBinder = function (fn, modifiers) {
    const vm = this;

    const handler = function (event) {
      if (modifiers.stop) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (typeof fn === 'string') {
        typeof vm[fn] === 'function' && vm[fn](event);
      } else if (typeof fn === 'function') {
        fn(event);
      }
    };

    handler.displayName = fn;
    return handler;
  };
}
