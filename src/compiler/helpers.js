import { emptyObject } from 'shared/util';

/* eslint-disable no-unused-vars */
export function baseWarn(msg, range) {
  console.error(`[Vue compiler]: ${msg}`);
}
/* eslint-enable no-unused-vars */

export function pluckModuleFunction(modules, key) {
  return modules
    ? modules.map((m) => m[key]).filter((_) => _)
    : [];
}

export function addProp(el, name, value, range) {
  (el.props || (el.props = [])).push(rangeSetItem({ name, value }, range));
  el.plain = false;
}

export function addAttr(el, name, value, range) {
  const attrs = (el.attrs || (el.attrs = []));
  attrs.push(rangeSetItem({ name, value }, range));
  el.plain = false;
}

// add a raw attr (use this in preTransforms)
export function addRawAttr(el, name, value, range) {
  el.attrsMap[name] = value;
  el.attrsList.push(rangeSetItem({ name, value }, range));
}

function prependModifierMarker(symbol, name) {
  return symbol + name; // mark the event as captured
}

export function addHandler(el, name, value, modifiers, important, warn, range) {
  modifiers = modifiers || emptyObject;
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && warn && modifiers.prevent && modifiers.passive) {
    warn(
      'passive and prevent can\'t be used together. '
      + 'Passive handler can\'t prevent default event.',
      range,
    );
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture;
    name = prependModifierMarker('!', name);
  }

  if (modifiers.once) {
    delete modifiers.once;
    name = prependModifierMarker('~', name);
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive;
    name = prependModifierMarker('&', name);
  }

  const events = el.events || (el.events = {});

  const newHandler = rangeSetItem({ value: value.trim() }, range);
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers;
  }

  const handlers = events[name];
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler);
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
  } else {
    events[name] = newHandler;
  }

  el.plain = false;
}

export function getRawBindingAttr(el, name) {
  return el.rawAttrsMap[name];
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
export function getAndRemoveAttr(el, name, removeFromMap) {
  let val;
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList;
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        break;
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name];
  }
  return val;
}

function rangeSetItem(item, range) {
  if (range) {
    if (range.start != null) {
      item.start = range.start;
    }
    if (range.end != null) {
      item.end = range.end;
    }
  }
  return item;
}
