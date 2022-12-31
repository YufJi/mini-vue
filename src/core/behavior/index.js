const behaviorBookmarks = new Map();

let index = 0;

function registryBehavior(options) {
  // 入参类型校验

  const is = `behavior-${index++}`;
  const behavior = createBehavior(is, options);
  behaviorBookmarks.set(is, behavior);
  return is;
}

function createBehavior(is, options) {
  let { data = {} } = options;
  const { created = noop, attached = noop, ready = noop, detached = noop } = options;

  try {
    data = JSON.parse(JSON.stringify(data));
  } catch (e) {
    data = {};
  }

  options = { ...options };

  const _options = defaultsDeep(options, {
    properties: {},
    methods: {},
    behaviors: [],
    definitionFilter: noop,
    lifetimes: {
      created,
      attached,
      ready,
      detached,
    },
    pageLifetimes: {
      show: noop,
      hide: noop,
      resize: noop,
    },
  });

  const ancestors = new Set();

  // 初始化给parent的值
  const init = {
    ..._options,
    is,
    data,
    properties: normalizeProperties(_options.properties),
    hasBehavior(is) {
      return ancestors.has(is);
    },
  };

  ancestors.add(is);

  init.behaviors.forEach((i) => {
    ancestors.add(i);

    behaviorBookmarks.get(i) && behaviorBookmarks.get(i).ancestors.forEach((j) => {
      ancestors.add(j);
    });
  });

  mixinBehaviors(init);

  return {
    init,
    ancestors,
  };
}
