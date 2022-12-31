import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS,
} from 'shared/constants';
import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject,
  isPrimitive,
  isUndef,
} from 'shared/util/index';

import config from '../../config';
import { unicodeRegExp } from '../lang';
import { nativeWatch, hasSymbol } from '../env';
import { warn } from '../debug';
import normalizeProps from './normalizeProps';

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies;

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance `
        + 'creation with the `new` keyword.',
      );
    }
    return defaultStrat(parent, child);
  };
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData(to, from) {
  if (!from) return to;

  let key;
  let toVal;
  let fromVal;

  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from);

  for (let i = 0; i < keys.length; i++) {
    key = keys[i];
    toVal = to[key];
    fromVal = from[key];

    to[key] = fromVal;
  }
  return to;
}

/**
 * Data
 */
export function mergeDataOrFn(parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal;
    }
    if (!parentVal) {
      return childVal;
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal,
      );
    };
  } else {
    return function mergedInstanceDataFn() {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal;
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal;
      if (instanceData) {
        return mergeData(instanceData, defaultData);
      } else {
        return defaultData;
      }
    };
  }
}

strats.data = function (parentVal, childVal, vm) {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function '
        + 'that returns a per-instance value in component '
        + 'definitions.',
        vm,
      );

      return parentVal;
    }
    return mergeDataOrFn(parentVal, childVal);
  }

  return mergeDataOrFn(parentVal, childVal, vm);
};

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook(parentVal, childVal) {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal;
  return res
    ? dedupeHooks(res)
    : res;
}

function dedupeHooks(hooks) {
  const res = [];
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i]);
    }
  }
  return res;
}

LIFECYCLE_HOOKS.forEach((hook) => {
  strats[hook] = mergeHook;
});

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets(parentVal, childVal, vm, key) {
  const res = Object.create(parentVal || null);
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm);
    return extend(res, childVal);
  } else {
    return res;
  }
}

ASSET_TYPES.forEach((type) => {
  strats[`${type}s`] = mergeAssets;
});

/**
 * Other object hashes.
 */
strats.props = strats.methods = strats.inject = strats.computed = function (parentVal, childVal, vm, key) {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) return childVal;
  const ret = Object.create(null);
  extend(ret, parentVal);
  if (childVal) extend(ret, childVal);
  return ret;
};

/**
 * Default strategy.
 */
const defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal;
};

/**
 * Validate component names
 */
function checkComponents(options) {
  for (const key in options.components) {
    validateComponentName(key);
  }
}

export function validateComponentName(name) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      `Invalid component name: "${name}". Component names `
      + 'should conform to valid custom element name in html5 specification.',
    );
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      `${'Do not use built-in or reserved HTML elements as component '
      + 'id: '}${name}`,
    );
  }
}

function assertObjectType(name, value, vm) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, `
      + `but got ${toRawType(value)}.`,
      vm,
    );
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
export function mergeOptions(parent, child, vm) {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child);
  }

  if (typeof child === 'function') {
    child = child.options;
  }

  normalizeProps(child, vm);

  // Apply mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i+=1) {
        parent = mergeOptions(parent, child.mixins[i], vm);
      }
    }
  }

  const options = {};
  let key;
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField(key) {
    const strat = strats[key] || defaultStrat;
    options[key] = strat(parent[key], child[key], vm, key);
  }

  return options;
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset(options, type, id, warnMissing) {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return;
  }

  const assets = options[type];
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id];

  const camelizedId = camelize(id);
  if (hasOwn(assets, camelizedId)) return assets[camelizedId];

  const PascalCaseId = capitalize(camelizedId);
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId];

  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      `Failed to resolve ${type.slice(0, -1)}: ${id}`,
      options,
    );
  }
  return res;
}