import * as templateA from './componentA.wxml';

// 页面组件
export const ComponentA = {
  props: {
    message: String,
    list: Array,
  },
  data() {
    return {
      message: '我是内部message',
    };
  },
  watch: {
    'list[2]': function (newVal, oldVal) {
      console.log('watch:', newVal, oldVal);
    },
  },
  created() {
    console.log('comA created');
  },
  mounted() {
    console.log('comA mounted', this);

    this.tiggerEvent('abc', {
      fnc: 'fn3',
    });
  },
  updated() {
    console.log('updated::', this.$props);
  },
  methods: {
    tiggerEvent(name, detail, option = {}) {
      const { bubbles, composed } = option;
      const event = new Event(name, {
        bubbles,
        composed,
      });
      event.detail = detail;

      this.$el && this.$el.dispatchEvent(event);
    },

    fn1() {
      this.setData({
        message: '内部改变的message change',
      });

      console.log('inner fn1');
    },
  },
  render: templateA.render,
  staticRenderFns: templateA.staticRenderFns,
};
