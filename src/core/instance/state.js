import config from '../config';
import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isReservedAttribute,
  invokeWithErrorHandling,
  parseSinglePath,
} from '../util/index';
import { queueUpdater } from '../scheduler';
import { isUpdatingChildComponent } from './lifecycle';

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop,
};

export function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

export function initState(vm) {
  vm._watchers = [];
  const opts = vm.$options;

  if (opts.props) initProps(vm, opts.props);

  if (opts.methods) initMethods(vm, opts.methods);

  if (opts.data) {
    initData(vm);
  } else {
    vm._data = {};
  }
}

function initProps(vm, propsOptions) {
  const propsData = vm.$options.propsData || {};
  const props = vm._props = {};
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = [];
  const isRoot = !vm.$parent;

  for (const key in propsOptions) {
    keys.push(key);
    const value = validateProp(key, propsOptions, propsData, vm);
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key);
      if (isReservedAttribute(hyphenatedKey)
          || config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm,
        );
      }

      defineReactive.call(vm, props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            'Avoid mutating a prop directly since the value will be '
            + 'overwritten whenever the parent component re-renders. '
            + 'Instead, use a data or computed property based on the prop\'s '
            + `value. Prop being mutated: "${key}"`,
            vm,
          );
        }
      });
    } else {
      defineReactive.call(vm, props, key, value);
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, '_props', key);
    }
  }
}

function initData(vm) {
  let { data } = vm.$options;
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {};
  if (!isPlainObject(data)) {
    data = {};
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n'
      + 'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm,
    );
  }
  // proxy data on instance
  const keys = Object.keys(data);
  const { props } = vm.$options;
  const { methods } = vm.$options;
  let i = keys.length;
  while (i--) {
    const key = keys[i];
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm,
        );
      }
    }

    // props中的key不代理
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. `
        + 'Use prop default value instead.',
        vm,
      );
    } else if (!isReserved(key)) {
      proxy(vm, '_data', key);
    }
  }
}

export function getData(data, vm) {
  try {
    return data.call(vm, vm);
  } catch (e) {
    handleError(e, vm, 'data()');
    return {};
  }
}

function initMethods(vm, methods) {
  const { props } = vm.$options;
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. `
          + 'Did you reference the function correctly?',
          vm,
        );
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm,
        );
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. `
          + 'Avoid defining component methods that start with _ or $.',
        );
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
  }
}

export function stateMixin(Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {};
  dataDef.get = function () { return this._data; };
  const propsDef = {};
  propsDef.get = function () { return this._props; };
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. '
        + 'Use nested data properties instead.',
        this,
      );
    };
    propsDef.set = function () {
      warn('$props is readonly.', this);
    };
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef);
  Object.defineProperty(Vue.prototype, '$props', propsDef);

  Vue.prototype.setData = function (data) {
    const vm = this;

    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        const value = data[key];
        // 解析key
        const paths = parseSinglePath(key);
        let parentObj;
        let curKey;
        let temp = vm;

        for (let i = 0; i < paths.length; i++) {
          curKey = paths[i]; // curKey
          parentObj = temp; // parentObj
          temp = temp[curKey];
        }

        if (parentObj) {
          parentObj[curKey] = value;
        }
      }
    }

    // update
    queueUpdater(vm);
  };
}

export function defineReactive(obj, key, val, customSetter) {
  const vm = this;
  const property = Object.getOwnPropertyDescriptor(obj, key);

  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get;
  const setter = property && property.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return;

      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }

      queueUpdater(vm);
    },
  });
}
