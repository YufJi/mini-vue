export function genHandlers(events, isNative) {
  const prefix = isNative ? 'nativeOn:' : 'on:';
  let staticHandlers = '';

  for (const name in events) {
    const handlerCode = genHandler(events[name]);
    staticHandlers += `"${name}":${handlerCode},`;
  }

  staticHandlers = `{${staticHandlers.slice(0, -1)}}`;

  return prefix + staticHandlers;
}

function genHandler(handler) {
  if (!handler) {
    return 'function(){}';
  }

  if (Array.isArray(handler)) {
    return `[${handler.map((handler) => genHandler(handler)).join(',')}]`;
  }

  return `eventBinder(${handler.value}, ${JSON.stringify(handler.modifiers)})`;
}
