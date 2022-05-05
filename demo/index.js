import { forOwn, set } from 'lodash';
import Vue from '@/web/entry-runtime';

import * as pageTemplate from './page.wxml';
import * as templateA from './componentA.wxml';
import * as gloablComA from './globalComA.wxml';

import './index.css';

Vue.component('global-a', {
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
  render: gloablComA.render,
  staticRenderFns: gloablComA.staticRenderFns,
});

const ComponentA = {
  props: {
    message: String,
    list: Array,
  },
  data() {
    return {
      aa: '',
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
    setData(data) {
      const vm = this;
      forOwn(data, (value, key) => {
        set(vm, key, value);
      });
    },
    eventBinder(method, modifiers) {
      const vm = this;
      const handler = function ($event) {
        if (modifiers.stop) {
          $event.stopPropagation();
        }
        vm[method].call(vm, ...arguments);
      };
      handler.displayName = method;
      return handler;
    },
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
        message: 'inner change',
      });
    },
  },
  render: templateA.render,
  staticRenderFns: templateA.staticRenderFns,
};

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

const App = {
  name: 'page',
  mixins: [mixinA, mixinB],
  data: {
    fn: 'fn',
    slot: 'abc',
    color: 'blue',
    hide: false,
    name: 'jyf',
    message: 'asaf',
    zero: 0,
    list: [1, 2, 3],
  },
  watch: {
    'list[2]': function (newVal, oldVal) {
      console.log('watch111:', newVal, oldVal);
    },
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
    setData(data) {
      const vm = this;
      forOwn(data, (value, key) => {
        set(vm, key, value);
      });
    },
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
        message: 'abc',
        'list[1]': 8,
        hide: true,
        slot: 'abc',
      });
      console.log('fn1');
    },
    fn2(event) {
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

new Vue(App)
  .$mount('#app');
