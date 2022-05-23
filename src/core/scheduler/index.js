import config from '../config';
import { callHook } from '../instance/lifecycle';

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE,
} from '../util/index';

export const MAX_UPDATE_COUNT = 100;

const queue = [];
let has = {};
let circular = {};
let waiting = false;
let flushing = false;
let index = 0;

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState() {
  index = queue.length = 0;
  has = {};
  if (process.env.NODE_ENV !== 'production') {
    circular = {};
  }
  waiting = flushing = false;
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0;

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow = Date.now;

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const { performance } = window;
  if (
    performance
    && typeof performance.now === 'function'
    && getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now();
  }
}

/**
 * Flush both queues and run the vm update.
 */
function flushSchedulerQueue() {
  currentFlushTimestamp = getNow();
  flushing = true;
  let vm;
  let id;

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. If a component is destroyed during a parent component's updating,
  //    its updater can be skipped.
  queue.sort((a, b) => a._uid - b._uid);

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    vm = queue[index];

    if (vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'beforeUpdate');
    }

    id = vm._uid;
    has[id] = null;

    vm._updateComponent();

    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1;
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop in a component render function.',
          vm,
        );
        break;
      }
    }
  }

  const updatedQueue = queue.slice();

  resetSchedulerState();

  // call component updated hooks
  callUpdatedHooks(updatedQueue);

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush');
  }
}

function callUpdatedHooks(queue) {
  let i = queue.length;
  while (i--) {
    const vm = queue[i];
    if (vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated');
    }
  }
}

/**
 * Push a vm into the update queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueUpdater(vm) {
  const { _uid } = vm;

  if (has[_uid] == null) {
    has[_uid] = true;
    if (!flushing) {
      queue.push(vm);
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1;
      while (i > index && queue[i]._uid > vm._uid) {
        i--;
      }
      queue.splice(i + 1, 0, vm);
    }

    // queue the flush
    if (!waiting) {
      waiting = true;

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue();
        return;
      }
      nextTick(flushSchedulerQueue);
    }
  }
}
