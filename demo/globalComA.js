import * as globalComA from './globalComA.wxml';

export const gloablA = {
  data() {
    return {
      aa: '',
    };
  },
  created() {
    console.log('globalA created');
  },
  mounted() {
    console.log('globalA mounted');
  },
  render: globalComA.render,
  staticRenderFns: globalComA.staticRenderFns,
};
