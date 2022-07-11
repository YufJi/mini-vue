import { base, hover } from '../mixins';
import * as template from './index.wxml';

import './index.less';

export default {
  name: 'tiny-view',
  mixins: [base, hover],
  listeners: {
    tap: '_onViewTap',
  },
  render: template.render,
  staticRenderFns: template.staticRenderFns,
};
