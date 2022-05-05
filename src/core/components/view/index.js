import './index.less';

export default {
  name: 'tiny-view',
  mixins: [],
  render(h) {
    const slot = this.$slots.default;

    return h('fragment', {}, slot);
  },
};
