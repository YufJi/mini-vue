const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

export function parseText(text) {
  const tagRE = defaultTagRE;
  if (!tagRE.test(text)) {
    return;
  }
  const tokens = [];
  let lastIndex = tagRE.lastIndex = 0;
  let match;
  let index;
  let tokenValue;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    // push text token
    if (index > lastIndex) {
      tokenValue = text.slice(lastIndex, index);
      tokens.push(JSON.stringify(tokenValue));
    }
    // tag token
    const exp = match[1].trim();
    tokens.push(`_s(${exp})`);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokenValue = text.slice(lastIndex);
    tokens.push(JSON.stringify(tokenValue));
  }
  return {
    expression: tokens.join('+'),
  };
}
