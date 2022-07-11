import { toString } from '../../util/index';
import { createTextVNode, createEmptyVNode } from '../../vdom/vnode';
import { renderList } from './render-list';
import { renderSlot } from './render-slot';
import { renderStatic } from './render-static';
import { getWxsMember } from './get-wxs-member';
import { getLooseDataMember } from './get-loose-data-member';
import { renderTemplate } from './render-template';

export function installRenderHelpers(target) {
  target.$toString = toString;
  target.$renderList = renderList;
  target.$renderSlot = renderSlot;
  target.$renderStatic = renderStatic;
  target.$createTextVNode = createTextVNode;
  target.$createEmptyVNode = createEmptyVNode;
  target.$renderTemplate = renderTemplate;
  target.$getWxsMember = getWxsMember;
  target.$getLooseDataMember = getLooseDataMember;
  // $$ctx, $$data 作为保留字面量
}
