import Vue from '@/core/index';

import { gloablA } from './globalComA';
import { Page } from './page';

import './index.css';

// 全局组件
Vue.component('global-a', gloablA);

const vm = new Vue(Page);

vm.$mount('#app');
