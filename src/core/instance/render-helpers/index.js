import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util/index';
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode';
import { renderList } from './render-list';
import { renderSlot } from './render-slot';
import { renderStatic } from './render-static';
import { resolveScopedSlots } from './resolve-scoped-slots';
import { getWxsMember } from './get-wxs-member';
import { getLooseDataMember } from './get-loose-data-member';
import { renderTemplate } from './render-template';

export function installRenderHelpers(target) {
  target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  target._t = renderSlot;
  target._m = renderStatic;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  target._u = resolveScopedSlots;
  target.$renderTemplate = renderTemplate;
  target.$getWxsMember = getWxsMember;
  target.$getLooseDataMember = getLooseDataMember;
  // _x, _a 作为保留字面量
}
