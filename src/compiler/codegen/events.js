import { transformExpression } from '../parser/expression-parser';

export function genHandlers(events, state) {
  const prefix = 'on:';
  let staticHandlers = '';

  for (const name in events) {
    const handlerCode = genHandler(events[name], state);
    staticHandlers += `"${name}":${handlerCode},`;
  }

  staticHandlers = `{${staticHandlers.slice(0, -1)}}`;

  return prefix + staticHandlers;
}

function genHandler(handler, state) {
  if (!handler) {
    return 'function(){}';
  }

  return `$$ctx.$eventBinder(${transformExpression(handler.value, state.scope)}, ${JSON.stringify(handler.modifiers)})`;
}
