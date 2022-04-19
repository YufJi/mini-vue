const global = (function () {
  if (typeof globalThis === 'object') return globalThis;
  try {
    return this || new Function('return this')();
  } catch (e) {
    if (typeof window === 'object') return window;
  }
})();

const __wxLibrary = {
  fileName: 'WAWebview.js',
  envType: 'WebView',
  contextType: 'others',
  execStart: Date.now(),
};
const __WAWebviewStartTime__ = Date.now();

let __wxConfig;

const isService = __wxLibrary.envType === 'Service';
const isWebView = __wxLibrary.envType === 'Webview';
const isWorker = __wxLibrary.envType === 'Worker';
const isWidget = __wxLibrary.envType === 'Widget';
const isIsolateContext = v;
const isGame = u;
const isApp = h;
const isMainContext = _;
const isSubContext = f;
const isSafeEnv = m;
const isSupportWorkerAPI = p;
const typeStr = r;
const isWXLibWorker = w;

const env = {
  get platform() {
    return (__wxConfig.platform || 'unknow').toLowerCase();
  },
  isIsolateContext,
  isGame,
  isApp,
  isMainContext,
  isSubContext,
  isSafeEnv,
  isService,
  isWebView,
  isWorker,
  isWidget,
  isSupportWorkerAPI,
  typeStr,
  isWXLibWorker,
};

class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  emit(type, arg) {
    if (this.listeners[type] && this.listeners[type].length > 0) {
      let clear = false;

      this.listeners[type].forEach((item) => {
        item.count !== 0 && item.cb(arg);
        item.count > 0 && item.count--;
        item.count === 0 && (clear = true);
      });

      if (clear) {
        this.listeners[type] = this.listeners[type].filter((item) => item.count !== 0);
      }

      return true;
    }

    return false;
  }

  many(type, cb, count) {
    if (!cb) return this;

    const item = { count, cb };
    this.listeners[type]
      ? this.listeners[type].push(item)
      : (this.listeners[type] = [item]);

    return this;
  }

  on(type, cb) {
    this.many(type, cb, -1);
  }

  once(type, cb) {
    this.many(type, cb, 1);
  }

  off(type, cb) {
    for (let i = 0; i < this.listeners[type].length; i++) {
      const item = this.listeners[type][i];
      if (item.cb === cb) {
        item.count = 0;
      }
    }
  }
}

const ee = new EventEmitter();

const Foundation = {
  env,
  global,
  isConfigReady: false,
  EventEmitter,
  on: ee.on.bind(ee),
  emit: ee.emit.bind(ee),
  once: ee.once.bind(ee),
  onConfigReady(cb) {
    ee.once.call(ee, 'lifeCycle:configReady', cb);
  },
  emitConfigReady(config) {
    ee.emit.call(ee, 'lifeCycle:configReady', config);
    this.isConfigReady = true;
  },
  onBridgeReady(callback) {
    WeixinJSBridge !== undefined
      ? callback()
      : typeof document === 'object'
            && document.addEventListener('WeixinJSBridgeReady', callback, false);
  },
};

__wxLibrary.onEnd = function () {
  Foundation.emitLibraryReady({});
};
