export function renderTemplate(template, data, ctx) {
  const _c = ctx._self._c || ctx.$createElement;

  return _c('fragment', {}, [template ? template(data, ctx) : null]);
}
