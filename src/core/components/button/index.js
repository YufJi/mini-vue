import { base, hover } from '../mixins';
import * as template from './index.wxml';

import './index.less';

// base hover ins

export default {
  name: 'tiny-button',
  mixins: [base, hover],
  props: {
    type: {
      type: String,
      value: 'default',
    },
    size: {
      type: String,
      value: 'default',
    },
    disabled: {
      type: Boolean,
    },
    plain: {
      type: Boolean,
    },
    loading: {
      type: Boolean,
    },
    formType: {
      type: String,
    },
    openType: {
      type: String,
      value: '',
    },
    hoverStartTime: {
      type: Number,
      value: 20,
    },
    hoverStayTime: {
      type: Number,
      value: 70,
    },
    hoverClass: {
      type: String,
      value: 'button-hover',
      observer: '_hoverClassChange',
    },
  },
  mounted() {
    this.$on('tap', this._onButtonTap);
  },
  methods: {
    _onButtonTap() {
      if (this.disabled) {
        return;
      }

      if (this.formType) {
        if (this.formType === 'submit') {
          this.$emit(new CustomEvent('formSubmit', {
            bubbles: true,
            composed: true,
          }));
        }

        if (this.formType === 'reset') {
          this.$emit(new CustomEvent('formReset', {
            bubbles: true,
            composed: true,
          }));
        }
      }

      if (!this._lock && this.openType) {
        this._lock = true;
        setTimeout(() => {
          this._lock = false;
        }, 1000);

        if (this.openType === 'share') {

        } else if (this.openType === 'getPhoneNumber') {

        } else if (this.openType === 'launchApp') {

        } else if (this.openType === 'contact') {

        }
      }
    },
  },
  render: template.render,
  staticRenderFns: template.staticRenderFns,
};
