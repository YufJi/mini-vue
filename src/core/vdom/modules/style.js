import {
  cached,
  camelize,
  extend,
  isDef,
  isUndef,
  hyphenate,
  getStyle,
  normalizeStyleBinding,
} from 'shared/util/index';

const cssVarRE = /^--/;
const importantRE = /\s*!important$/;
const setProp = (el, name, val) => {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val);
  } else if (importantRE.test(val)) {
    el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important');
  } else {
    const normalizedName = normalize(name);
    el.style[normalizedName] = val;
  }
};

const vendorNames = ['Webkit', 'Moz', 'ms'];

let emptyStyle;
const normalize = cached((prop) => {
  emptyStyle = emptyStyle || document.createElement('div').style;
  prop = camelize(prop);
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop;
  }

  const capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  for (let i = 0; i < vendorNames.length; i++) {
    const name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name;
    }
  }
});

function updateStyle(oldVnode, vnode) {
  const { data } = vnode;
  const oldData = oldVnode.data;

  if (isUndef(data.staticStyle) && isUndef(data.style)
    && isUndef(oldData.staticStyle) && isUndef(oldData.style)
  ) {
    return;
  }

  let cur;
  let name;
  const el = vnode.elm;
  const oldStaticStyle = oldData.staticStyle;
  const oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  const oldStyle = oldStaticStyle || oldStyleBinding;

  const style = normalizeStyleBinding(vnode.data.style) || {};

  vnode.data.normalizedStyle = style;

  const newStyle = getStyle(vnode, true);

  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '');
    }
  }
  for (name in newStyle) {
    cur = newStyle[name];
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      setProp(el, name, cur == null ? '' : cur);
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle,
};
