import { forOwn, set } from 'lodash';

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

// 页面
export const Page = {
  name: 'page',
  mixins: [mixinA, mixinB],
  data: {
    fn: 'fn',
    slot: 'abc',
    color: 'blue',
    hide: false,
    name: 'jyf',
    // message: '外部默认messsgae',
    zero: 0,
    list: [1, 2, 3],
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
    eventBinder(method, modifiers) {
      const vm = this;
      const handler = function ($event) {
        if (modifiers.stop) {
          $event.stopPropagation();
        }

        if (typeof method === 'string') {
          vm[method].call(vm, $event);
        } else if (typeof method === 'function') {
          method.call(null, $event);
        }
      };
      handler.displayName = method;
      return handler;
    },
    fn1(event) {
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
      this.setData({
        message: 'xx',
        'list[3]': 888,
      });

      console.log('fn2');
    },
    fn3(event) {
      console.log('fn3', event);
    },
  },
  render: pageTemplate.render,
  staticRenderFns: pageTemplate.staticRenderFns,
  components: {
    'component-a': ComponentA,
  },
};
