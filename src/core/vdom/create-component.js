import { resolveConstructorOptions } from 'core/instance/init';
import VNode from './vnode';

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
} from '../util/index';

import {
  extractPropsFromVNodeData,
} from './helpers/index';

import {
  callHook,
  activeInstance,
  updateChildComponent,
} from '../instance/lifecycle';

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  init(vnode, hydrating) {
    const child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance);

    child.$mount(hydrating ? vnode.elm : undefined);
  },

  prepatch(oldVnode, vnode) {
    const options = vnode.componentOptions;
    const child = vnode.componentInstance = oldVnode.componentInstance;
    updateChildComponent(
      child,
      options.propsData, // updated props
      vnode, // new parent vnode
      options.children, // new children
    );
  },

  insert(vnode) {
    const { context, componentInstance } = vnode;
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true;
      callHook(componentInstance, 'mounted');
    }
  },

  destroy(vnode) {
    const { componentInstance } = vnode;
    if (!componentInstance._isDestroyed) {
      componentInstance.$destroy();
    }
  },
};

const hooksToMerge = Object.keys(componentVNodeHooks);

export function createComponent(Ctor, data, context, children, tag) {
  if (isUndef(Ctor)) {
    return;
  }

  const baseCtor = context.$options._base;

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context);
    }
    return;
  }

  data = data || {};

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor);

  // extract props
  const propsData = extractPropsFromVNodeData(data, Ctor, tag);

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const { slot } = data;
    data = {};
    if (slot) {
      data.slot = slot;
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data);

  // return a placeholder vnode
  const name = Ctor.options.name || tag;
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    { Ctor, propsData, tag, children },
  );

  return vnode;
}

export function createComponentInstanceForVnode(vnode, parent) {
  const options = {
    _isComponent: true,
    _parentVnode: vnode,
    parent,
  };

  return new vnode.componentOptions.Ctor(options);
}

function installComponentHooks(data) {
  const hooks = data.hook || (data.hook = {});
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i];
    const existing = hooks[key];
    const toMerge = componentVNodeHooks[key];
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
    }
  }
}

function mergeHook(f1, f2) {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
  return merged;
}
