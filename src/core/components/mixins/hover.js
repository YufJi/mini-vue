import { supportsPassive } from '../../util/index';

const PASSIVE_TOUCH = supportsPassive ? { passive: true } : undefined;

export default {
  props: {
    hoverStartTime: {
      type: Number,
      value: 50,
    },
    hoverStayTime: {
      type: Number,
      value: 400,
    },
    hoverClass: {
      type: String,
      observer: '_hoverClassChange',
    },
    hoverStopPropagation: {
      type: Boolean,
      observer: '_hoverStopChange',
    },
  },
  created() {
    this._hoverClass = [];
  },
  methods: {
    hasBehavior(type) {
      // simple mock of hasBehavior method
      if (type === 'hover') {
        return true;
      }

      if (super.hasBehavior) {
        return super.hasBehavior(type);
      }
    },

    bindHover() {
      if (!this._bindHover) {
        this._bindHover = true;

        this.$el.addEventListener('touchstart', this.hoverTouchStartId, PASSIVE_TOUCH);
        this.$el.addEventListener('touchend', this.hoverTouchEndId);
        this.$el.addEventListener('touchcancel', this.hoverCancelId);
        this.$el.addEventListener('touchmove', this.hoverCancelId, PASSIVE_TOUCH);
      }
    },

    unbindHover() {
      if (this._bindHover) {
        this._bindHover = false;
        this.$el.removeEventListener('touchstart', this.hoverTouchStartId);
        this.$el.removeEventListener('touchend', this.hoverTouchEndId);
        this.$el.removeEventListener('touchcancel', this.hoverCancelId);
        this.$el.removeEventListener('touchmove', this.hoverCancelId);
      }
    },

    hoverTouchStart(e) {
      if (!e._hoverPropagationStopped) {
        if (this.hoverStopPropagation) {
          e._hoverPropagationStopped = true;
        }

        if (this._hoverTouch && e.touches.length > 1 && !this._hovering) {
          this.hoverCancel();
          return;
        }

        this._hoverTouch = true;

        if (this.hoverClass === 'none' || this.disabled) {
          return;
        }

        this._hoverStyleTimeId = setTimeout(() => {
          this._hovering = true;

          if (this._hoverClass.length > 0) {
            for (let e = 0; e < this._hoverClass.length; e++) {
              this.$el.classList.toggle(this._hoverClass[e], true);
            }
          }

          if (!this._hoverTouch) {
            window.requestAnimationFrame(() => {
              clearTimeout(this._hoverStayTimeId);
              this._hoverStayTimeId = setTimeout(() => {
                this._hoverReset();
              }, this.hoverStayTime);
            });
          }
        }, this.hoverStartTime);
      }
    },

    hoverTouchEnd() {
      this._hoverTouch = false;

      if (this._hovering) {
        window.requestAnimationFrame(() => {
          clearTimeout(this._hoverStayTimeId);
          this._hoverStayTimeId = setTimeout(() => {
            this._hoverReset();
          }, this.hoverStayTime);
        });
      }
    },

    hoverCancel() {
      this._hoverTouch = false;
      clearTimeout(this._hoverStyleTimeId);

      this._hoverReset();
    },

    _hoverClassChange(targetClassName) {
      if (!targetClassName) {
        return;
      }

      const classes = targetClassName.split(/\s/);
      this._hoverClass = [];

      // remove hover effects
      if (targetClassName === 'none' && !this.hoverStopPropagation) {
        return this.unbindHover();
      }

      for (let n = 0; n < classes.length; n+=1) {
        classes[n] && this._hoverClass.push(classes[n]);
      }

      this.bindHover();
    },

    _hoverStopChange(e) {
      if (this.hoverClass === 'none' && !e) {
        return this.unbindHover();
      }

      this.bindHover();
    },

    _hoverReset() {
      if (this._hovering) {
        this._hovering = false;

        if (this.hoverClass !== 'none' && this._hoverClass.length > 0) {
          for (let e = 0; e < this._hoverClass.length; e++) {
            if (this.$el.classList.contains(this._hoverClass[e])) {
              this.$el.classList.toggle(this._hoverClass[e], false);
            }
          }
        }
      }
    },
  },
};
