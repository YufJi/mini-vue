# 是什么
这个项目是对小程序的渲染层重新的实现，核心功能基于Vue@2。

将其作为小程序的渲染层基础库，将默认的模板编译层做了较大的改动兼容wxml写法。

删掉了vue中一些非必要的概念能力，如指令、v-model、filter等


# 运行
```
yarn

yarn start
```



# 解决Vue不支持监听数组下标改变

原因：

由于vue@2是基于基于defineProperty的响应式更新方式，且array只是拦截部分原型方法，导致不支持监听数组下标改变。

解决方式：

- 移除基于defineProperty的响应式更新方式
- vm实例增加方法setData，通过手动调用该方法执行更新，就是把自动挡降回手动挡的意思
```js
Vue.prototype.setData = function (data) {
    const vm = this;

    forOwn(data, (value, key) => {
      set(vm, key, value);
    });

    // update
    queueUpdater(vm);
  };
```

# 后续计划

- [ ] 将[tiny-v1](https://github.com/YufJi/tiny-v1)中的渲染层替换掉
- [ ] mixins配置改用小程序的behavior方式
