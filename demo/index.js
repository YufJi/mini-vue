import Vue from '@/web/entry-runtime';

import { gloablA } from './globalComA';
import { Page } from './page';

import './index.css';

// 全局组件
Vue.component('global-a', gloablA);

new Vue(Page).$mount('#app');
