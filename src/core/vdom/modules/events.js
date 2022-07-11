import { isDef, isUndef, supportsPassive, isUsingMicroTask } from '../../util/index';
import { currentFlushTimestamp } from '../../scheduler';
import { updateListeners } from '../helpers/index';
import { emptyNode } from '../patch';

function createOnceHandler(target, event, handler, capture) {
  return function onceHandler() {
    const res = handler.apply(null, arguments);
    if (res !== null) {
      remove(target, event, onceHandler, capture);
    }
  };
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
// implementation and does not fire microtasks in between event propagation, so
// safe to exclude.
const useMicrotaskFix = isUsingMicroTask;

const EVENT_BLACK_LIST = ['click'];
const PRESS_DELAY = 350;
const TAP_DISTANCE = 5;
const TAP_BLACK_LIST = [
  'TINY-BUTTON',
  'TINY-CHECKBOX',
  'TINY-RADIO',
  'TINY-MAP',
];

export function add(target, name, handler, capture, passive) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp;
    const original = handler;
    handler = original._wrapper = function (e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...
        e.target === e.currentTarget
        // event is fired after handler attachment
        || e.timeStamp >= attachedTimestamp
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value
        || e.timeStamp <= 0
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        || e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments);
      }
    };
  }

  switch (name) {
    case 'tap':
      addTapEvent(target);

      target.addEventListener('tiny-tap', (e) => {
        const event = wrapEvent(target, {
          type: 'tap',
          touches: e.detail.originEvent.changedTouches,
          changedTouches: e.detail.originEvent.changedTouches,
          detail: { x: e.detail.x, y: e.detail.y },
          target: e.detail.originEvent.target,
          timeStamp: e.timeStamp,
          stopPropagation() {
            e.stopPropagation();
          },
          preventDefault() {
            return e.detail.originEvent.preventDefault();
          },
        }, name);

        return handler.call(target, event);
      }, capture);

      break;

    case 'longtap':
    case 'longpress':
      addTapEvent(target);

      target.addEventListener('tiny-longpress', (e) => {
        e.longpressFired();

        const event = wrapEvent(target, e, name);
        handler.call(target, event);
      }, capture);
      break;

    case 'touchstart':
    case 'touchend':
    case 'touchmove':
    case 'touchcancel':
      target.addEventListener(name, (e) => {
        // ios 触发了滑动返回
        if (e.__frozenBySwipeBack) return;

        const detail = {
          x: e.pageX,
          y: e.pageY,
        };
        // detail is a read-only property, so re-define it ....
        Object.defineProperty(e, 'detail', {
          get: function get() {
            return detail;
          },
          configurable: true,
        });

        const event = wrapEvent(target, e, name);

        return callback.call(target, event);
      }, supportsPassive ? { capture, passive } : capture);

      // 组件可能会取消touchmove事件，并用touchmove替换, 主要是swiper会用到
      if (name === 'touchmove') {
        target.addEventListener('tiny-touchmove', (e) => {
          const { srcMoveEvent } = e.detail;

          const event = wrapEvent(target, {
            type: name,
            touches: srcMoveEvent.touches,
            changedTouches: srcMoveEvent.changedTouches,
            detail: {
              x: srcMoveEvent.pageX,
              y: srcMoveEvent.pageY,
            },
            target: e.target,
            timeStamp: e.timeStamp,
            preventDefault() {
              return srcMoveEvent.preventDefault();
            },
            stopPropagation() {
              return e.stopPropagation();
            },
          }, name);

          return callback.call(target, event);
        });
      }
      break;

    default:
      // 不在黑名单中
      if (EVENT_BLACK_LIST.indexOf(name) === -1) {
        target.addEventListener(name, (e) => {
          callback.call(target, e);
        }, capture);
      }
      break;
  }
}

function addTapEvent(node) {
  if (node.__hasTapEvent) return;
  node.__hasTapEvent = true;

  let pressTimer;
  let pressStart;
  let ended;

  const touchstartHandler = (e) => {
    if (e.__handledTap) return;

    ended = false;
    pressStart = {
      x: e.touches[0].pageX,
      y: e.touches[0].pageY,
      originEvent: e,
    };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      // dispatch longpress event
      const pressEvent = new Event('tiny-longpress', {
        bubbles: true,
        composed: true,
      });
      pressEvent.detail = pressStart;
      pressEvent.longpressFired = function () {
        ended = true;
      };
      node.dispatchEvent(pressEvent);
    }, PRESS_DELAY);

    e.__handledTap = true;
  };

  const touchmoveHandler = (e) => {
    if (ended || !pressStart) {
      return;
    }

    const dx = Math.abs(e.changedTouches[0].pageX - pressStart.x);
    const dy = Math.abs(e.changedTouches[0].pageY - pressStart.y);

    if (dx > TAP_DISTANCE || dy > TAP_DISTANCE) {
      ended = true;
      clearTimeout(pressTimer);
    }
  };

  const touchendHandler = (e) => {
    if (ended || !pressStart) {
      return;
    }

    ended = true;
    clearTimeout(pressTimer);
    // 如果没有触发touchmove的判断，这里还要再来一下
    const dx = Math.abs(e.changedTouches[0].pageX - pressStart.x);
    const dy = Math.abs(e.changedTouches[0].pageY - pressStart.y);

    if (dx > TAP_DISTANCE || dy > TAP_DISTANCE) {
      return;
    }

    // dispatch tap event
    if (node.disabled && TAP_BLACK_LIST.indexOf(node.tagName) !== -1) {
      // if element is disabled, 那就不发了
      return;
    }

    const tapEvent = new Event('tiny-tap', {
      bubbles: true,
      composed: true,
    });

    tapEvent.detail = {
      x: e.changedTouches[0].pageX,
      y: e.changedTouches[0].pageY,
      originEvent: e,
    };

    node.dispatchEvent(tapEvent);
  };

  const touchcancelHandler = (e) => {
    ended = true;
    clearTimeout(pressTimer);
  };

  node.addEventListener('touchstart', touchstartHandler);
  node.addEventListener('touchmove', touchmoveHandler);
  node.addEventListener('touchend', touchendHandler);
  node.addEventListener('touchcancel', touchcancelHandler);
}

function wrapEvent(node, event, type) {
  const targetElement = event.target;

  const target = {
    id: targetElement.id || '',
    dataset: targetElement._dataset || {},
  };
  const currentTarget = {
    id: node.id || '',
    dataset: node._dataset || {},
  };

  Object.assign(target, {
    offsetLeft: targetElement.offsetLeft || 0,
    offsetTop: targetElement.offsetTop || 0,
  });

  Object.assign(currentTarget, {
    offsetLeft: node.offsetLeft || 0,
    offsetTop: node.offsetTop || 0,
  });

  const isCanvasTouches = node.tagName.toUpperCase() === 'TINY-CANVAS' && ['touchstart', 'touchend', 'touchmove', 'touchcancel'].includes(type);

  return {
    type,
    timeStamp: event.timeStamp || window.performance.now(),
    target,
    currentTarget,
    detail: event.detail,
    touches: isCanvasTouches ? getCanvasTouches(node, event.touches) : getTouches(event.touches),
    changedTouches: isCanvasTouches
      ? getCanvasTouches(node, event.changedTouches)
      : getTouches(event.changedTouches),
    stopPropagation: event.stopPropagation,
    preventDefault: event.preventDefault,
  };
}

function getTouches(touches) {
  if (touches) {
    const touchInfo = [];

    for (let idx = 0; idx < touches.length; idx+=1) {
      const touch = touches[idx];
      touchInfo.push({
        identifier: touch.identifier,
        pageX: touch.pageX,
        pageY: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY,
        force: touch.force || 0,
      });
    }

    return touchInfo;
  }

  return [];
}

function getCanvasTouches(node, touches) {
  if (touches) {
    const touchInfo = [];
    const rect = node._getBox();

    for (let idx = 0; idx < touches.length; idx+=1) {
      const touch = touches[idx];
      touchInfo.push({
        identifier: touch.identifier,
        x: touch.pageX - rect.left,
        y: touch.pageY - rect.top,
        pageX: touch.pageX,
        pageY: touch.pageY,
        clientX: touch.clientX,
        clientY: touch.clientY,
        force: touch.force || 0,
      });
    }

    return touchInfo;
  }
}

export function remove(target, name, handler, capture) {
  target.removeEventListener(
    name,
    handler._wrapper || handler,
    capture,
  );
}

function updateDOMListeners(oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return;
  }
  const on = vnode.data.on || {};
  const oldOn = oldVnode.data.on || {};
  // vnode is empty when removing all listeners,
  // and use old vnode dom element
  const target = vnode.elm || oldVnode.elm;
  updateListeners(target, on, oldOn, add, remove, createOnceHandler, vnode.context);
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners,
  destroy: (vnode) => updateDOMListeners(vnode, emptyNode),
};
