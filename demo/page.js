import { ComponentA } from './componentA';
import * as pageTemplate from './page.wxml';

const mixinA = {
  data() {
    return {
      message: 'hello A',
      foo: 'abc A',
    };
  },
};

const mixinB = {
  data() {
    return {
      message: 'hello B',
      foo: 'abc B',
    };
  },
};

let idx = 0;

// 页面
export const Page = {
  name: 'tiny-page',
  mixins: [mixinA, mixinB],
  data: {
    fn: `fn${idx}`,
    slot: 'abc',
    color: 'blue',
    hide: false,
    name: 'jyf',
    // message: '外部默认messsgae',
    zero: 0,
    list: [1, 2, 3],
    hidden: false,
  },
  created() {
    console.log('page created');
  },
  beforeMount() {
    console.log('page beforeMount');
  },
  mounted() {
    console.log('page mounted', this);
  },
  methods: {
    fn1(event) {
      console.log('event is:', event);
      this.setData({
        name: 'xhq',
        color: 'yellow',
        message: '外部改变的message',
        'list[1]': 8,
        hide: true,
        slot: 'abcd',
      });
      console.log('fn1');
    },
    fn2(event) {
      console.log('event is:', event);
      this.setData({
        color: 'green',
        message: 'xx',
        'list[3]': 888,
      });

      console.log('fn2');
    },
    fn0(event) {
      console.log('fn0', event);
    },
    toogleHidden() {
      this.setData({
        hidden: !this.hidden,
      });
    },
    setFn() {
      idx++;
      this.setData({
        fn: `fn${idx%3}`,
      });
    },
  },
  render: pageTemplate.render,
  staticRenderFns: pageTemplate.staticRenderFns,
  components: {
    'component-a': ComponentA,
  },
};
