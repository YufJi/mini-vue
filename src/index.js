import { forOwn, set } from 'lodash';
import Vue from './web/entry-runtime';
import * as compiler from './web/entry-compiler';
import './index.css';

const gloablComA = `
<virtual>
  <span>i am global com A</span>

  <slot name="abc" wx:for="{{[1,2]}}" ></slot>
</virtual>
`;

const globalA = compiler.compileToFunctions(gloablComA);

console.log('globalA:', compiler.compile(gloablComA));

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
  render: globalA.render,
  staticRenderFns: globalA.staticRenderFns,
});

const templateA = `
  <div>
    <span bindclick="fn1">i am com A {{message}}</span>

    <slot name="abc"></slot>
  </div>
`;

const resultA = compiler.compileToFunctions(templateA);

console.log('resultA:', compiler.compile(templateA));

const ComponentA = {
  props: {
    message: String,
  },
  data() {
    return {
      aa: '',
    };
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
        console.log('call:', method);
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
  render: resultA.render,
  staticRenderFns: resultA.staticRenderFns,
};

const template = `
  <tiny-page>
    <header class="abc-{{name}} sad" style="color: {{color}}; font-size: 12px" catch:click="{{fn}}1">
      <h1 bind:click="fn2">I'm a template!</h1>
    </header>
    <p wx:if="{{message === 'abc'}}">{{ message }}</p>
    <p wx:else>No message.</p>
    <div hidden="{{hide ? true : false}}" wx:for="{{[zero,1,2,3]}}">{{item}}</div>
    <div wx:for="{{list}}" wx:for-index="idx" wx:key="*this"> {{idx}} : {{item}}</div>

    <component-a id="adsf" bind:abc="fn3" message="{{message}}">
      <div slot="abc">a's slot {{slot}}</div>
    </component-a>

    <global-a>
      <div slot="abc">global's slot {{slot}}</div>
    </global-a>

    <div>
      <div>sadaf</div>
      <span>dadd</span>
    </div>
  </tiny-page>
`;

const result = compiler.compileToFunctions(template);

console.log('result:', compiler.compile(template));

const App = {
  name: 'tiny-page',
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
  created() {
    console.log('page created');
  },
  beforeMount() {
    console.log('page beforeMount');
  },
  mounted() {
    console.log('page mounted');
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
        console.log('call:', method);
        if (modifiers.stop) {
          $event.stopPropagation();
        }
        vm[method].call(vm, ...arguments);
      };
      handler.displayName = method;
      return handler;
    },
    fn1(event) {
      this.setData({
        name: 'xhq',
        color: 'yellow',
        message: 'abc',
        'list[2]': 99,
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
  render: result.render,
  staticRenderFns: result.staticRenderFns,
  components: {
    'component-a': ComponentA,
  },
};

new Vue(App)
  .$mount('#app');