export default {
  methods: {
    hasBehavior(type) {
      if (type === 'base') {
        return true;
      }

      return false;
    },
    triggerEvent(eventName, detail = {}) {
      // 这个api用来触发组件自己独有的事件，比如swiper的change，input的focus，
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: false, // 微信的做法，这些事件都不会冒泡
        composed: false,
      });

      this.$emit(event);
    },
  },
};
