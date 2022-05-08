/**
 * Runtime helper for rendering <slot>
 */
export function renderSlot(ctx, name, fallbackRender) {
  const nodes = ctx.$slots[name]
      || (typeof fallbackRender === 'function' ? fallbackRender() : fallbackRender);

  return nodes;
}
