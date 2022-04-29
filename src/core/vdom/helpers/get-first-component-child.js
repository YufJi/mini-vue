import { isDef } from 'shared/util';

export function getFirstComponentChild(children) {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (isDef(c) && isDef(c.componentOptions)) {
        return c;
      }
    }
  }
}
