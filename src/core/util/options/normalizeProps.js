import {
  camelize,
  toRawType,
  isPlainObject,
} from 'shared/util/index';

import { warn } from '../debug';

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
export default function normalizeProps(options, vm) {
  const { props } = options;
  if (!props) return;

  const res = {};
  let val;
  let name;

  if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key];
      name = camelize(key);

      if (isPropertyType(val)) {
        res[name] = {
          type: val,
          value: getConstructorDefaultValue(val),
        };
      } else if (isStandardProperty(val)) {
        res[name] = {
          type: val.type,
          value: val.value || getConstructorDefaultValue(val.type),
        };
      }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      'Invalid value for option "props": expected an Array or an Object, '
      + `but got ${toRawType(props)}.`,
      vm,
    );
  }
  options.props = res;
}

function isPropertyType(target) {
  const constructors = [String, Boolean, Number, Array, Object, null];
  return constructors.indexOf(target) !== -1;
}

function isStandardProperty(target) {
  if (!isPlainObject(target)) return false;
  return isPropertyType(target.type);
}

function getConstructorDefaultValue(type) {
  switch (type) {
    case String:
      return '';

    case Number:
      return 0;

    case Boolean:
      return false;

    case Array:
      return [];

    case Object:
      return {};

    case null:
      return null;

    default:
      warn('incorrect property type');
  }
}
