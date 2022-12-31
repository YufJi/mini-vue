import { base, hover } from '../mixins';
import * as template from './index.wxml';

import './index.less';

export default {
  name: 'tiny-icon',
  mixins: [base],
  props: {
    type: {
      type: String,
    },
    color: {
      type: String,
    },
    size: {
      type: Number,
      value: 24,
    },
  },
  render: template.render,
  staticRenderFns: template.staticRenderFns,
};
