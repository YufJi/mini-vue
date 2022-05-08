import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util';
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode';
import { renderList } from './render-list';
import { renderSlot } from './render-slot';
import { resolveFilter } from './resolve-filter';
import { checkKeyCodes } from './check-keycodes';
import { bindObjectProps } from './bind-object-props';
import { renderStatic, markOnce } from './render-static';
import { bindObjectListeners } from './bind-object-listeners';
import { resolveScopedSlots } from './resolve-scoped-slots';
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys';
import getWxsMember from './get-wxs-member';
import getLooseDataMember from './get-loose-data-member';

export function installRenderHelpers(target) {
  target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  target._t = renderSlot;
  target._m = renderStatic;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  target.$getWxsMember = getWxsMember;
  target.$getLooseDataMember = getLooseDataMember;
  // _x, _a 作为保留字面量
}
