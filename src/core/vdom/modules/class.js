import {
  isDef,
  isUndef,
  isObject,
} from 'shared/util/index';

function genClassForVnode(vnode) {
  let { data } = vnode;
  let parentNode = vnode;
  let childNode = vnode;

  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode;
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data);
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data);
    }
  }
  return renderClass(data.staticClass, data.class);
}

function mergeClassData(child, parent) {
  return {
    staticClass: concatClass(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class,
  };
}

function renderClass(staticClass, dynamicClass) {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concatClass(staticClass, stringifyClass(dynamicClass));
  }
  /* istanbul ignore next */
  return '';
}

function concatClass(a, b) {
  return a ? b ? (`${a} ${b}`) : a : (b || '');
}

function stringifyClass(value) {
  if (Array.isArray(value)) {
    return stringifyArray(value);
  }
  if (isObject(value)) {
    return stringifyObject(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  /* istanbul ignore next */
  return '';
}

function stringifyArray(value) {
  let res = '';
  let stringified;
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' ';
      res += stringified;
    }
  }
  return res;
}

function stringifyObject(value) {
  let res = '';
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' ';
      res += key;
    }
  }
  return res;
}

function updateClass(oldVnode, vnode) {
  const el = vnode.elm;
  const { data } = vnode;
  const oldData = oldVnode.data;
  if (
    isUndef(data.staticClass)
    && isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass)
        && isUndef(oldData.class)
      )
    )
  ) {
    return;
  }

  const cls = genClassForVnode(vnode);

  // set the class
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls);
    el._prevClass = cls;
  }
}

export default {
  create: updateClass,
  update: updateClass,
};
