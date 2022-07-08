export default {
  name: 'tiny-view',
  render(data, ctx) {
    const _vm = this;
    const h = _vm.$createElement;

    const slot = ctx.$slots.default;

    return h('fragment', {}, slot);
  },
};
