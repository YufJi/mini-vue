import {
  extend,
  isDef,
  isUndef,
  makeMap,
} from 'shared/util/index';

const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

const isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only');

const isFalsyAttrValue = (val) => {
  return val == null || val === false;
};

const convertEnumeratedValue = (key, value) => {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false'
    // allow arbitrary string value for contenteditable
    : key === 'contenteditable' && isValidContentEditableValue(value)
      ? value
      : 'true';
};

const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,'
  + 'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,'
  + 'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,'
  + 'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,'
  + 'required,reversed,scoped,seamless,selected,sortable,'
  + 'truespeed,typemustmatch,visible',
);

const xlinkNS = 'http://www.w3.org/1999/xlink';

const isXlink = (name) => {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink';
};

const getXlinkProp = (name) => {
  return isXlink(name) ? name.slice(6, name.length) : '';
};

function updateAttrs(oldVnode, vnode) {
  const opts = vnode.componentOptions;
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return;
  }
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return;
  }
  let key;
  let cur;
  let old;
  const { elm } = vnode;

  if (!elm.tagName) {
    return;
  }

  const oldAttrs = oldVnode.data.attrs || {};
  const attrs = vnode.data.attrs || {};

  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      setAttr(elm, key, cur, vnode.data.pre);
    }
  }

  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key);
      }
    }
  }
}

function setAttr(el, key, value, isInPre) {
  if (isInPre || el.tagName.indexOf('-') > -1) {
    baseSetAttr(el, key, value);
  } else if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag
      value = key === 'allowfullscreen' && el.tagName === 'EMBED'
        ? 'true'
        : key;
      el.setAttribute(key, value);
    }
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, convertEnumeratedValue(key, value));
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    baseSetAttr(el, key, value);
  }
}

function baseSetAttr(el, key, value) {
  if (isFalsyAttrValue(value)) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

export default {
  create: updateAttrs,
  update: updateAttrs,
};
