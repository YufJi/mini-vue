const compiler = require('../dist/vue-template-compiler');

const templateA = `
  <div>
    <span>i am com A</span>

    <slot name="abc"></slot>
  </div>
`;

const resultA = compiler.compile(templateA);

console.log('resultA:', resultA);

const template = `
  <div>
    <header class="abc-{{name}} sad" style="color: {{color}}; font-size: 12px" catch:click="{{fn}}1">
      <h1 bind:click="fn2">I'm a template!</h1>
    </header>
    <p wx:if="{{message === 'abc'}}">{{ message }}</p>
    <p wx:else>No message.</p>
    <div hidden="{{hide ? true : false}}" wx:for="{{[zero,1,2,3]}}">{{item}}</div>
    <div wx:for="{{list}}" wx:for-index="idx" wx:key="*this"> {{idx}} : {{item}}</div>

    <component-a>
      <div slot="abc">a's slot {{slot}}</div>
    </component-a>

    <global-a>
      <div slot="abc">global's slot {{slot}}</div>
    </global-a>

    <div>
      <span>dsa</span>
      <div>ddsad</div>
    </div>
  </div>
`;

const result = compiler.compile(template);

console.log('result:', result);
