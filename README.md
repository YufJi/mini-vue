wxml语法注意

- template不能包含template，被包含的不会渲染
- template中不支持slot
- template支持wx:for wx:if等



# 解决Vue不支持监听数组下标改变

- 移除基于defineProperty的响应式更新方式
- vm实例增加方法setData，通过该方法执行更新队列
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