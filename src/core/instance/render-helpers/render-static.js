/**
 * Runtime helper for rendering static trees.
 */
export function renderStatic(ctx, index, isInFor) {
  const cached = ctx._staticTrees || (ctx._staticTrees = []);
  let tree = cached[index];
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  if (tree && !isInFor) {
    return tree;
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = ctx.$options.staticRenderFns[index].call(
    ctx._renderProxy,
    null,
    ctx, // for render fns generated for functional component templates
  );
  markStatic(tree, `__static__${index}`, false);
  return tree;
}

function markStatic(tree, key, isOnce) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], `${key}_${i}`, isOnce);
      }
    }
  } else {
    markStaticNode(tree, key, isOnce);
  }
}

function markStaticNode(node, key, isOnce) {
  node.isStatic = true;
  node.key = key;
  node.isOnce = isOnce;
}
