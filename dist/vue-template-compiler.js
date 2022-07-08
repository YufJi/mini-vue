'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var he = _interopDefault(require('he'));
var parser = _interopDefault(require('@babel/parser'));
var traverse = _interopDefault(require('@babel/traverse'));
var generate$1 = _interopDefault(require('@babel/generator'));
var t = _interopDefault(require('@babel/types'));

var isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,block,fragment'
  + 'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,'
  + 'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,'
  + 'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,'
  + 's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,'
  + 'embed,object,param,source,canvas,script,noscript,del,ins,'
  + 'caption,col,colgroup,table,thead,tbody,td,th,tr,'
  + 'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,'
  + 'output,progress,select,textarea,'
  + 'details,dialog,menu,menuitem,summary,'
  + 'content,element,shadow,template,blockquote,iframe,tfoot'
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
var isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,'
  + 'foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,'
  + 'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
);

var isPreTag = function (tag) { return tag === 'pre'; };

var isReservedTag = function (tag) {
  return isHTMLTag(tag) || isSVG(tag);
};

function getTagNamespace(tag) {
  if (isSVG(tag)) {
    return 'svg';
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math';
  }
}

var unknownElementCache = Object.create(null);
function isUnknownElement(tag) {
  if (isReservedTag(tag)) {
    return false;
  }
  tag = tag.toLowerCase();
  /* istanbul ignore if */
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag];
  }
  var el = document.createElement(tag);
  if (tag.indexOf('-') > -1) {
    // http://stackoverflow.com/a/28210364/1070244
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement
      || el.constructor === window.HTMLElement
    ));
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()));
  }
}

var isTextInputType = makeMap('text,number,password,search,email,tel,url');

var parseStyleText = cached(function (cssText) {
  var res = {};
  var listDelimiter = /;(?![^(]*\))/g;
  var propertyDelimiter = /:(.+)/;
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      var tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return res;
});

var emptyObject = Object.freeze({});

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap(str, expectsLowerCase) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase
    ? function (val) { return map[val.toLowerCase()]; }
    : function (val) { return map[val]; };
}

/**
 * Check if a tag is a built-in tag.
 */
var isBuiltInTag = makeMap('slot', true);

/**
 * Check if an attribute is a reserved attribute.
 */
var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

/**
 * Create a cached version of a pure function.
 */
function cached(fn) {
  var cache = Object.create(null);
  return function cachedFn(str) {
    var hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE = /-(\w)/g;
var camelize = cached(function (str) {
  return str.replace(camelizeRE, function (_, c) { return (c ? c.toUpperCase() : ''); });
});

/**
 * Mix properties into target object.
 */
function extend(to, _from) {
  for (var key in _from) {
    to[key] = _from[key];
  }
  return to;
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
function noop(a, b, c) {}

/**
 * Always return false.
 */
var no = function (a, b, c) { return false; };

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 */
var identity = function (_) { return _; };

/**
 * Generate a string containing static keys from compiler modules.
 */
function genStaticKeys(modules) {
  return modules.reduce(function (keys, m) {
    return keys.concat(m.staticKeys || []);
  }, []).join(',');
}

/* eslint-disable no-unused-vars */
function baseWarn(msg, range) {
  console.error(("[Vue compiler]: " + msg));
}
/* eslint-enable no-unused-vars */

function pluckModuleFunction(modules, key) {
  return modules
    ? modules.map(function (m) { return m[key]; }).filter(function (_) { return _; })
    : [];
}

function addAttr(el, name, value, range) {
  var attrs = (el.attrs || (el.attrs = []));
  attrs.push(rangeSetItem({ name: name, value: value }, range));
  el.plain = false;
}

function prependModifierMarker(symbol, name) {
  return symbol + name; // mark the event as captured
}

function addHandler(el, name, value, modifiers, warn, range) {
  modifiers = modifiers || emptyObject;
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && warn && modifiers.prevent && modifiers.passive) {
    warn(
      'passive and prevent can\'t be used together. '
      + 'Passive handler can\'t prevent default event.',
      range
    );
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture;
    name = prependModifierMarker('!', name);
  }

  if (modifiers.once) {
    delete modifiers.once;
    name = prependModifierMarker('~', name);
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive;
    name = prependModifierMarker('&', name);
  }

  var events = el.events || (el.events = {});

  var newHandler = rangeSetItem({ value: value.trim() }, range);
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers;
  }

  events[name] = newHandler;

  el.plain = false;
}

function getRawBindingAttr(el, name) {
  return el.rawAttrsMap[name];
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
function getAndRemoveAttr(el, name, removeFromMap) {
  var val;
  if ((val = el.attrsMap[name]) != null) {
    var list = el.attrsList;
    for (var i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        break;
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name];
  }
  return val;
}

function rangeSetItem(item, range) {
  if (range) {
    if (range.start != null) {
      item.start = range.start;
    }
    if (range.end != null) {
      item.end = range.end;
    }
  }
  return item;
}

/**
 * Check if a string starts with $ or _
 */

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

var isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,'
  + 'link,meta,param,source,track,wbr'
);

// Elements that you can, intentionally, leave open
// (and which close themselves)
var canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
);

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
var isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,'
  + 'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,'
  + 'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,'
  + 'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,'
  + 'title,tr,track'
);

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson (MPL-1.1 OR Apache-2.0 OR GPL-2.0-or-later)
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

// Regular Expressions for parsing tags and attributes
var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + (unicodeRegExp.source) + "]*";
var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
var startTagOpen = new RegExp(("^<" + qnameCapture));
var startTagClose = /^\s*(\/?)>/;
var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
var doctype = /^<!DOCTYPE [^>]+>/i;
// #7298: escape - to avoid being passed as HTML comment when inlined in page
var comment = /^<!\--/;
var conditionalComment = /^<!\[/;

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea', true);
var reCache = {};

var decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'",
};
var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

// #5992
var isIgnoreNewlineTag = makeMap('pre,textarea', true);
var shouldIgnoreFirstNewline = function (tag, html) { return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'; };

function decodeAttr(value, shouldDecodeNewlines) {
  var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
  return value.replace(re, function (match) { return decodingMap[match]; });
}

function parseHTML(html, options) {
  var stack = [];
  var expectHTML = options.expectHTML;
  var isUnaryTag = options.isUnaryTag || no;
  var canBeLeftOpenTag = options.canBeLeftOpenTag || no;
  var index = 0;
  var last;
  var lastTag;

  while (html) {
    last = html;
    // Make sure we're not in a plaintext content element like script/style
    if (!lastTag || !isPlainTextElement(lastTag)) {
      var textEnd = html.indexOf('<');
      if (textEnd === 0) {
        // Comment:
        if (comment.test(html)) {
          var commentEnd = html.indexOf('-->');

          if (commentEnd >= 0) {
            if (options.shouldKeepComment) {
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
            }
            advance(commentEnd + 3);
            continue;
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (conditionalComment.test(html)) {
          var conditionalEnd = html.indexOf(']>');

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue;
          }
        }

        // Doctype:
        var doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue;
        }

        // End tag:
        var endTagMatch = html.match(endTag);
        if (endTagMatch) {
          var curIndex = index;
          advance(endTagMatch[0].length);
          parseEndTag(endTagMatch[1], curIndex, index);
          continue;
        }

        // Start tag:
        var startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1);
          }
          continue;
        }
      }

      var text = (void 0);
      var rest = (void 0);
      var next = (void 0);
      if (textEnd >= 0) {
        rest = html.slice(textEnd);
        while (
          !endTag.test(rest)
          && !startTagOpen.test(rest)
          && !comment.test(rest)
          && !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1);
          if (next < 0) { break; }
          textEnd += next;
          rest = html.slice(textEnd);
        }
        text = html.substring(0, textEnd);
      }

      if (textEnd < 0) {
        text = html;
      }

      if (text) {
        advance(text.length);
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    } else {
      var endTagLength = 0;
      var stackedTag = lastTag.toLowerCase();
      var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp(("([\\s\\S]*?)(</" + stackedTag + "[^>]*>)"), 'i'));
      var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length;
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1);
        }
        if (options.chars) {
          options.chars(text);
        }
        return '';
      });
      index += html.length - rest$1.length;
      html = rest$1;
      parseEndTag(stackedTag, index - endTagLength, index);
    }

    if (html === last) {
      options.chars && options.chars(html);
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(("Mal-formatted tag at end of template: \"" + html + "\""), { start: index + html.length });
      }
      break;
    }
  }

  // Clean up any remaining tags
  parseEndTag();

  function advance(n) {
    index += n;
    html = html.substring(n);
  }

  function parseStartTag() {
    var start = html.match(startTagOpen);
    if (start) {
      var match = {
        tagName: start[1],
        attrs: [],
        start: index,
      };
      advance(start[0].length);
      var end;
      var attr;
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        attr.start = index;
        advance(attr[0].length);
        attr.end = index;
        match.attrs.push(attr);
      }
      if (end) {
        match.unarySlash = end[1];
        advance(end[0].length);
        match.end = index;
        return match;
      }
    }
  }

  function handleStartTag(match) {
    var tagName = match.tagName;
    var unarySlash = match.unarySlash;

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag);
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName);
      }
    }

    var unary = isUnaryTag(tagName) || !!unarySlash;

    var l = match.attrs.length;
    var attrs = new Array(l);
    for (var i = 0; i < l; i++) {
      var args = match.attrs[i];
      var value = args[3] || args[4] || args[5] || '';
      var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines;
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines),
      };
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length;
        attrs[i].end = args.end;
      }
    }

    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
      lastTag = tagName;
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end);
    }
  }

  function parseEndTag(tagName, start, end) {
    var pos; var
      lowerCasedTagName;
    if (start == null) { start = index; }
    if (end == null) { end = index; }

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase();
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break;
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (var i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production'
          && (i > pos || !tagName)
          && options.warn
        ) {
          options.warn(
            ("tag <" + (stack[i].tag) + "> has no matching end tag."),
            { start: stack[i].start, end: stack[i].end }
          );
        }
        if (options.end) {
          options.end(stack[i].tag, start, end);
        }
      }

      // Remove the open elements from the stack
      stack.length = pos;
      lastTag = pos && stack[pos - 1].tag;
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end);
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end);
      }
      if (options.end) {
        options.end(tagName, start, end);
      }
    }
  }
}

var fullExpressionTagReg = /^\{\{([^`{}]+)\}\}$/;
var expressionTagReg = /\{\{([^`{}]+)\}\}/g;

function escapeString(str) {
  return str.replace(/[\\']/g, '\\$&');
}

function hasExpression(str) {
  if ( str === void 0 ) str = '';

  return str.match(expressionTagReg);
}

function transformExpression(str, scope, config) {
  if ( config === void 0 ) config = {};

  var ret = transformExpressionByPart(str, scope, config);

  return ret.join(' + ');
}

function transformExpressionByPart(str, scope, config) {
  str = str.trim();
  // 非表达式
  if (!str.match(expressionTagReg)) {
    return [("\"" + (escapeString(str)) + "\"")];
  }

  var match = str.match(fullExpressionTagReg);
  if (match) {
    return [transformCode(match[1], scope, config)];
  }

  var totalLength = str.length;
  var lastIndex = 0;
  var gen = [];
  /* eslint no-cond-assign:0 */
  while (match = expressionTagReg.exec(str)) {
    var code = match[1];
    if (match.index !== lastIndex) {
      gen.push(("\"" + (escapeString(str.slice(lastIndex, match.index))) + "\""));
    }

    // 变量
    gen.push(transformCode(code, scope, config));

    lastIndex = expressionTagReg.lastIndex;
  }

  if (lastIndex < totalLength) {
    gen.push(("\"" + (escapeString(str.slice(lastIndex))) + "\""));
  }

  return gen;
}

var visitor = {
  noScope: true,
  ReferencedIdentifier: function ReferencedIdentifier(path) {
    var parent = path.parent;
    var node = path.node;

    if (node.__xmlSkipped) {
      return;
    }

    var nameScope = findScope(this.xmlScope, node.name);

    if (!nameScope) {
      node.name = "_a['" + (node.name) + "']";
    } else if (nameScope === 'wxs') {
      var parentType = parent && parent.type;
      if (node.type === 'Identifier' && !(parentType === 'MemberExpression' && parent.object === node)) {
        var args = [t.arrayExpression([node])];
        if (parentType === 'CallExpression' && parent.callee === node) {
          args.push(t.numericLiteral(1));
        }
        var newNode = t.callExpression(t.identifier('$getWxsMember'), args);
        newNode.callee.__xmlSkipped = true;
        path.replaceWith(newNode);
        path.skip();
      }
    }
  },
  MemberExpression: function MemberExpression(path) {
    var parent = path.parent;
    var node = path.node;

    var parentType = parent && parent.type;
    // do not transform function call
    // skip call callee x[y.q]
    /* root member node */
    if (parentType !== 'MemberExpression') {
      // allow {{x.y.z}} even x is undefined
      var members = [node];
      var root = node.object;

      while (root.type === 'MemberExpression') {
        members.push(root);
        root = root.object;
      }

      var isSJS = findScope(this.xmlScope, root.name) === 'wxs';

      if (!isSJS && this.strictDataMember) {
        return;
      }

      // TODO. use https://www.npmjs.com/package/babel-plugin-transform-optional-chaining
      var memberFn = isSJS ? '$getWxsMember' : '$getLooseDataMember';
      members.reverse();
      var args = [root];

      if (isSJS) {
        root.__xmlSkipped = true;
      }

      if (root.type === 'ThisExpression') {
        args.pop();
        args.push(members.shift());
      }

      if (!members.length) {
        return;
      }

      members.forEach(function (m) {
        // x[y]
        if (m.computed) {
          args.push(m.property);
        } else {
          // x.y
          args.push(t.stringLiteral(m.property.name));
        }
      });

      var callArgs = [t.arrayExpression(args)];
      if (parent.callee === node) {
        callArgs.push(t.numericLiteral(1));
      }

      var newNode = t.callExpression(t.identifier(memberFn), callArgs);
      newNode.callee.__xmlSkipped = true;
      // will process a.v of x.y[a.v]
      path.replaceWith(newNode);
      // path.skip();
    }
  },
};

var babylonConfig = {
  plugins: ['objectRestSpread'],
};

function transformCode(exp, xmlScope, config) {
  var codeStr = exp;

  if (config.forceObject) {
    codeStr = "{" + codeStr + "}";
  }

  var expression = parser.parseExpression(codeStr, babylonConfig);
  var start = expression.start;
  var end = expression.end;
  var ast = {
    type: 'File',
    start: start,
    end: end,
    program: {
      start: start,
      end: end,
      type: 'Program',
      body: [{
        start: start,
        end: end,
        type: 'ExpressionStatement',
        expression: expression,
      }],
    },
  };

  traverse(ast, visitor, undefined, {
    xmlScope: xmlScope,
    strictDataMember: !!config.strictDataMember,
  });

  var code;

  try {
    code = generate$1(ast).code;
  } catch (error) {
    console.log('生成code出错：', error);
  }

  if (code.charAt(code.length - 1) === ';') {
    code = code.slice(0, -1);
  }

  return ("" + code);
}

function findScope(scope, name) {
  if (scope) {
    var result = false;

    for (var i = scope.length - 1; i > -1; i--) {
      var item = scope[i];
      if (item[name]) {
        result = item[name];
        break;
      }
    }

    return result;
  }

  return false;
}

var lineBreakRE = /[\r\n]/;
var whitespaceRE = /[ \f\t\r\n]+/g;
var invalidAttributeRE = /[\s"'<>\/=]/;
var variableRE = /^[$\w]+$/;
var forKeyRE = /^[\w.$]+$/;
var eventRE = /^(capture-)?(bind|catch):?([A-Za-z_][A-Za-z0-9_]+)$/;

var decodeHTMLCached = cached(he.decode);

// configurable state
var warn;

var transforms;
var preTransforms;
var postTransforms;
var platformIsPreTag;
var platformGetTagNamespace;

function createASTElement(tag, attrs, parent) {
  return {
    type: 1,
    tag: tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent: parent,
    children: [],
  };
}

/**
 * Convert HTML string to AST.
 */
function parse(template, options) {
  warn = options.warn || baseWarn;

  platformIsPreTag = options.isPreTag || no;
  platformGetTagNamespace = options.getTagNamespace || no;

  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
  transforms = pluckModuleFunction(options.modules, 'transformNode');
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');

  var stack = [];
  var preserveWhitespace = options.preserveWhitespace !== false;
  var whitespaceOption = options.whitespace;
  var root;
  var currentParent;
  var inPre = false;
  var warned = false;

  function warnOnce(msg, range) {
    if (!warned) {
      warned = true;
      warn(msg, range);
    }
  }

  // 元素闭合
  function closeElement(element) {
    trimEndingWhitespace(element);
    if (!element.processed) {
      element = processElement(element, options);
    }
    // tree management
    if (!stack.length && element !== root) {
      // allow root elements with v-if, v-else-if and v-else
      if (root.if && (element.elseif || element.else)) {
        addIfCondition(root, {
          exp: element.elseif,
          block: element,
        });
      } else if (process.env.NODE_ENV !== 'production') {
        warnOnce(
          'Component template should contain exactly one root element. '
          + 'If you are using wx:if on multiple elements, '
          + 'use wx:elseif to chain them instead.',
          { start: element.start }
        );
      }
    }

    if (currentParent && !element.forbidden) {
      if (element.elseif || element.else) {
        processIfConditions(element, currentParent);
      } else {
        currentParent.children.push(element);
        element.parent = currentParent;
      }
    }

    // remove trailing whitespace node again
    trimEndingWhitespace(element);

    if (platformIsPreTag(element.tag)) {
      inPre = false;
    }
    // apply post-transforms
    for (var i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options);
    }
  }

  function trimEndingWhitespace(el) {
    // remove trailing whitespace node
    if (!inPre) {
      var lastNode;
      while (
        (lastNode = el.children[el.children.length - 1])
        && lastNode.type === 3
        && lastNode.text === ' '
      ) {
        el.children.pop();
      }
    }
  }

  // 解析template
  parseHTML(template, {
    warn: warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    start: function start(tag, attrs, unary, start$1, end) {
      // check namespace.
      // inherit parent ns if there is one
      var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

      var element = createASTElement(tag, attrs, currentParent);
      if (ns) {
        element.ns = ns;
      }

      if (process.env.NODE_ENV !== 'production') {
        if (options.outputSourceRange) {
          element.start = start$1;
          element.end = end;
          element.rawAttrsMap = element.attrsList.reduce(function (cumulated, attr) {
            cumulated[attr.name] = attr;
            return cumulated;
          }, {});
        }

        attrs.forEach(function (attr) {
          if (invalidAttributeRE.test(attr.name)) {
            warn(
              'Invalid dynamic argument expression: attribute names cannot contain '
              + 'spaces, quotes, <, >, / or =.',
              {
                start: attr.start + attr.name.indexOf('['),
                end: attr.start + attr.name.length,
              }
            );
          }
        });
      }

      if (isForbiddenTag(element)) {
        element.forbidden = true;
        process.env.NODE_ENV !== 'production' && warn(
          'Templates should only be responsible for mapping the state to the '
          + 'UI. Avoid placing tags with side-effects in your templates, such as '
          + "<" + tag + ">" + ', as they will not be parsed.',
          { start: element.start }
        );
      }

      // 属性是否有绑定
      for (var i = 0; i < element.attrsList.length; i++) {
        var ref = element.attrsList[i];
        var value = ref.value;

        if (hasExpression(value)) {
          element.hasBindings = true;
          break;
        }
      }

      // apply pre-transforms
      for (var i$1 = 0; i$1 < preTransforms.length; i$1++) {
        element = preTransforms[i$1](element, options) || element;
      }

      if (platformIsPreTag(element.tag)) {
        inPre = true;
      }

      if (!element.processed) {
        // structural directives
        processFor(element);
        processIf(element);
      }

      if (!root) {
        root = element;
      }

      if (!unary) {
        currentParent = element;
        stack.push(element);
      } else {
        closeElement(element);
      }
    },

    end: function end(tag, start, end$1) {
      var element = stack[stack.length - 1];
      // pop stack
      stack.length -= 1;
      currentParent = stack[stack.length - 1];
      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        element.end = end$1;
      }
      closeElement(element);
    },

    chars: function chars(text, start, end) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production') {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.',
              { start: start }
            );
          } else if ((text = text.trim())) {
            warnOnce(
              ("text \"" + text + "\" outside root element will be ignored."),
              { start: start }
            );
          }
        }
        return;
      }

      var children = currentParent.children;
      if (inPre || text.trim()) {
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
      } else if (!children.length) {
        // remove the whitespace-only node right after an opening tag
        text = '';
      } else if (whitespaceOption) {
        if (whitespaceOption === 'condense') {
          // in condense mode, remove the whitespace node if it contains
          // line break, otherwise condense to a single space
          text = lineBreakRE.test(text) ? '' : ' ';
        } else {
          text = ' ';
        }
      } else {
        text = preserveWhitespace ? ' ' : '';
      }
      if (text) {
        if (!inPre && whitespaceOption === 'condense') {
          // condense consecutive whitespaces into single space
          text = text.replace(whitespaceRE, ' ');
        }
        var res;
        var child;
        if (text !== ' ' && (res = text)) {
          child = {
            type: 2,
            expression: res,
            text: text,
          };
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          child = {
            type: 3,
            text: text,
          };
        }
        if (child) {
          if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
            child.start = start;
            child.end = end;
          }
          children.push(child);
        }
      }
    },
    comment: function comment(text, start, end) {
      // adding anything as a sibling to the root node is forbidden
      // comments should still be allowed, but ignored
      if (currentParent) {
        var child = {
          type: 3,
          text: text,
          isComment: true,
        };
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          child.start = start;
          child.end = end;
        }
        currentParent.children.push(child);
      }
    },
  });
  return root;
}

function processElement(element, options) {
  // determine whether this is a plain element after
  // removing structural attributes
  element.plain = (
    !element.key
    && !element.attrsList.length
  );

  processBlock(element);
  processSlotContent(element);
  processSlotOutlet(element);
  processWxs(element);
  processImport(element);
  processInclude(element);
  processTemplate(element);

  // apply transforms
  for (var i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element;
  }
  processAttrs(element);

  return element;
}

function processFor(el) {
  var exp;

  // wx:for
  if ((exp = getAndRemoveAttr(el, 'wx:for'))) {
    el.for = exp;
    el.forItem = 'item';
    el.forIndex = 'index';
  }

  // wx:for-item
  if ((exp = getAndRemoveAttr(el, 'wx:for-item'))) {
    if (exp.match(variableRE)) {
      el.forItem = exp;
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        ("Invalid wx:for-item expression: " + exp),
        el.rawAttrsMap['wx:for-item']
      );
    }
  }

  // wx:for-index
  if ((exp = getAndRemoveAttr(el, 'wx:for-index'))) {
    if (exp.match(variableRE)) {
      el.forIndex = exp;
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        ("Invalid wx:for-index expression: " + exp),
        el.rawAttrsMap['wx:for-index']
      );
    }
  }

  // wx:key
  if (el.for && (exp = getAndRemoveAttr(el, 'wx:key'))) {
    if (exp === '*this' || exp.match(forKeyRE)) {
      el.key = exp === '*this' ? el.forItem : ((el.forItem) + "." + exp);
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        ("Invalid wx:key expression: " + exp),
        el.rawAttrsMap['wx:key']
      );
    }
  }
}

function processIf(el) {
  var exp = getAndRemoveAttr(el, 'wx:if');

  if (exp) {
    el.if = exp;
    addIfCondition(el, {
      exp: el.if,
      block: el,
    });
  } else {
    if (getAndRemoveAttr(el, 'wx:else') != null) {
      el.else = true;
    }
    var elseif = getAndRemoveAttr(el, 'wx:elseif');
    if (elseif) {
      el.elseif = elseif;
    }
  }
}

function processIfConditions(el, parent) {
  var prev = findPrevElement(parent.children);
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif,
      block: el,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      "wx:" + (el.elseif ? (("elseif=\"" + (el.elseif) + "\"")) : 'else') + " "
      + "used on element <" + (el.tag) + "> without corresponding wx:if.",
      el.rawAttrsMap[el.elseif ? 'wx:elseif' : 'wx:else']
    );
  }
}

function findPrevElement(children) {
  var i = children.length;
  while (i--) {
    if (children[i].type === 1) {
      return children[i];
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          "text \"" + (children[i].text.trim()) + "\" between wx:if and wx:else(if) "
          + 'will be ignored.',
          children[i]
        );
      }
      children.pop();
    }
  }
}

function addIfCondition(el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}

// handle content being passed to a component as slot,
// e.g. <div slot="xxx">
function processSlotContent(el) {
  var exp = getAndRemoveAttr(el, 'slot');

  if (exp) {
    el.slotTarget = exp;
  }
}

// handle <slot/> outlets
function processSlotOutlet(el) {
  if (el.tag === 'slot') {
    var exp = getAndRemoveAttr(el, 'name');
    el.slotName = exp || 'default';
    // slot不支持for
    delete el.for;
    if (process.env.NODE_ENV !== 'production' && el.key) {
      warn(
        '`key` does not work on <slot> because slots are abstract outlets '
        + 'and can possibly expand into multiple elements. '
        + 'Use the key on a wrapping element instead.',
        getRawBindingAttr(el, 'key')
      );
    }
  }
}

function processBlock(el) {
  if (el.tag === 'block') {
    el.tag = 'fragment';
  }
}

function processWxs(el) {
  if (el.tag === 'wxs') {
    var wxsSrc = getAndRemoveAttr(el, 'src');
    var wxsModule = getAndRemoveAttr(el, 'module');

    if (wxsSrc && wxsModule) {
      el.src = wxsSrc;
      el.module = wxsModule;
    } else {
      warn('"src" and "module" expected in wxs tag');
    }
  }
}

function processImport(el) {
  if (el.tag === 'import') {
    var importSrc = getAndRemoveAttr(el, 'src');
    el.src = importSrc;
  }
}

function processInclude(el) {
  if (el.tag === 'include') {
    var includeSrc = getAndRemoveAttr(el, 'src');
    el.src = includeSrc;
  }
}

function processTemplate(el) {
  if (el.tag === 'template') {
    var exp;
    if (exp = getAndRemoveAttr(el, 'is')) {
      // 可以是表达式
      el.templateIs = exp;
      el.templateData = getAndRemoveAttr(el, 'data');
    } else if ((exp = getAndRemoveAttr(el, 'name')) && !hasExpression(exp)) {
      // 不可以是表达式
      el.templateDefine = exp;
    }
  }
}

// 处理属性
function processAttrs(el) {
  var list = el.attrsList;
  var i;
  var l;
  var name;
  var value;

  for (i = 0, l = list.length; i < l; i++) {
    // 属性名
    name = list[i].name;
    // 属性值
    value = list[i].value;

    // 事件绑定
    if (eventRE.test(name)) {
      var match = name.match(eventRE);
      var capture = !!match[1];
      var stop = match[2] === 'catch';
      var eventName = match[3];

      var modifiers = {};

      if (stop) {
        modifiers.stop = stop;
      }
      if (capture) {
        modifiers.capture = capture;
      }

      addHandler(el, eventName, value, modifiers, warn, list[i]);
    } else {
      addAttr(el, name, value, list[i]);
    }
  }
}

function makeAttrsMap(attrs) {
  var map = {};
  for (var i = 0, l = attrs.length; i < l; i++) {
    if (
      process.env.NODE_ENV !== 'production'
      && map[attrs[i].name]
    ) {
      warn(("duplicate attribute: " + (attrs[i].name)), attrs[i]);
    }
    map[attrs[i].name] = attrs[i].value;
  }
  return map;
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag(el) {
  return el.tag === 'script' || el.tag === 'style';
}

function isForbiddenTag(el) {
  return (
    el.tag === 'style'
    || (el.tag === 'script' && (
      !el.attrsMap.type
      || el.attrsMap.type === 'text/javascript'
    ))
  );
}

var isStaticKey;
var isPlatformReservedTag;

var genStaticKeysCached = cached(genStaticKeys$1);

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
function optimize(root, options) {
  if (!root) { return; }
  isStaticKey = genStaticKeysCached(options.staticKeys || '');
  isPlatformReservedTag = options.isReservedTag || no;

  // first pass: mark all non-static nodes.
  markStatic(root);
  // second pass: mark static roots.
  markStaticRoots(root, false);
}

function genStaticKeys$1(keys) {
  return makeMap(
    ("type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap" + (keys ? ("," + keys) : ''))
  );
}

function markStatic(node) {
  node.static = isStatic(node);

  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (!isPlatformReservedTag(node.tag) && node.tag !== 'slot') {
      return;
    }

    for (var i = 0, l = node.children.length; i < l; i++) {
      var child = node.children[i];
      markStatic(child);
      if (!child.static) {
        node.static = false;
      }
    }
    if (node.ifConditions) {
      for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
        var ref = node.ifConditions[i$1];
        var block = ref.block;
        markStatic(block);
        if (!block.static) {
          node.static = false;
        }
      }
    }
  }
}

function markStaticRoots(node, isInFor) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor;
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    if (node.static && node.children.length && !(
      node.children.length === 1
      && node.children[0].type === 3
    )) {
      node.staticRoot = true;
      return;
    } else {
      node.staticRoot = false;
    }
    if (node.children) {
      for (var i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for);
      }
    }
    if (node.ifConditions) {
      for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
        markStaticRoots(node.ifConditions[i$1].block, isInFor);
      }
    }
  }
}

function isStatic(node) {
  if (node.type === 2) { // expression
    return false;
  }
  if (node.type === 3) { // text
    return true;
  }

  return !!((
    !node.hasBindings // no dynamic bindings
    && !node.if && !node.for // not v-if or v-for or v-else
    && !isBuiltInTag(node.tag) // not a built-in
    && isPlatformReservedTag(node.tag) // not a component
    && !isDirectChildOfTemplateFor(node)
    && Object.keys(node).every(isStaticKey)
  ) || node.pre);
}

function isDirectChildOfTemplateFor(node) {
  while (node.parent) {
    node = node.parent;
    if (node.tag !== 'template') {
      return false;
    }
    if (node.for) {
      return true;
    }
  }
  return false;
}

// 文本需要toString

function transformText(str, scope, config) {
  if ( config === void 0 ) config = {};

  var ret = transformExpressionByPart(str, scope, config);

  return ret.map(function (item) { return ("_s(" + item + ")"); }).join(' + ');
}

function genHandlers(events, state) {
  var prefix = 'on:';
  var staticHandlers = '';

  for (var name in events) {
    var handlerCode = genHandler(events[name], state);
    staticHandlers += "\"" + name + "\":" + handlerCode + ",";
  }

  staticHandlers = "{" + (staticHandlers.slice(0, -1)) + "}";

  return prefix + staticHandlers;
}

function genHandler(handler, state) {
  if (!handler) {
    return 'function(){}';
  }

  return ("_x.$eventBinder(" + (transformExpression(handler.value, state.scope)) + ", " + (JSON.stringify(handler.modifiers)) + ")");
}

var CodegenState = function CodegenState(options) {
  this.options = options;
  this.warn = options.warn || baseWarn;
  this.transforms = pluckModuleFunction(options.modules, 'transformCode');
  this.dataGenFns = pluckModuleFunction(options.modules, 'genData');
  var isReservedTag = options.isReservedTag || no;
  this.maybeComponent = function (el) { return !isReservedTag(el.tag); };
  this.onceId = 0;
  this.staticRenderFns = [];

  // 引入的wxs
  this.wxs = [];
  // 存储自己定义的template
  this.innerTpls = {};
  // 存储import的template
  this.importTplDeps = [];

  this.rootScope = makeScope();
  this.scope = [this.rootScope];
};

function makeScope(content) {
  if (content) {
    return Object.assign(Object.create(null), content);
  } else {
    return Object.create(null);
  }
}

var genRenderFn = function (code) { return ("function(_a, _x) {\n  const _c = _x._self._c || _x.$createElement;\n  const { _n, _s, _l, _t, _m, _v, _e, $getWxsMember, $getLooseDataMember, $renderTemplate } = _x;\n\n  return " + code + "\n}"); };

function generate(
  ast,
  options
) {
  var state = new CodegenState(options);
  // fix #11483, Root level <script> tags should not be rendered.
  var code = ast ? (ast.tag === 'script' ? 'null' : genElement(ast, state)) : '_c("div")';

  var header = [
    'export const $innerTemplates = {};' ];

  // 生成innerTpl
  Object.keys(state.innerTpls).forEach(function (key) {
    var renderFn = state.innerTpls[key];
    var code = "$innerTemplates['" + key + "'] = " + renderFn;
    header.push(code);
  });

  header.push('const $templates = Object.assign({},');
  // import
  state.importTplDeps.forEach(function (item) {
    header.push(("require(\"" + item + "\").$innerTemplates,"));
  });
  header.push('$innerTemplates');
  header.push(');');

  // include

  // 生成wxs
  state.wxs.forEach(function (item) {
    header.unshift(item);
  });

  return {
    header: header,
    render: genRenderFn(code),
    staticRenderFns: state.staticRenderFns,
  };
}

function genElement(el, state) {
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state);
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state);
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state);
  } else if (el.tag === 'template') {
    return genTemplate(el, state);
  } else if (el.tag === 'import') {
    return genImport(el, state);
  } else if (el.tag === 'include') {
    return genInclude(el);
  } else if (el.tag === 'slot') {
    return genSlot(el, state);
  } else if (el.tag === 'wxs') {
    return genWxs(el, state);
  } else {
    // component or element
    var code;
    var data;

    if (!el.plain) {
      data = genData(el, state);
    }

    var children = genChildren(el, state, true);

    code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";

    // module transforms
    for (var i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code);
    }
    return code;
  }
}

// hoist static sub-trees out
function genStatic(el, state) {
  el.staticProcessed = true;
  state.staticRenderFns.push(genRenderFn(genElement(el, state)));
  return ("_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ',true' : '') + ")");
}

function genIf(el, state, altGen, altEmpty) {
  el.ifProcessed = true; // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty);
}

function genIfConditions(
  conditions,
  state,
  altGen,
  altEmpty
) {
  if (!conditions.length) {
    return altEmpty || '_e()';
  }

  var condition = conditions.shift();
  if (condition.exp) {
    return ("(" + (transformExpression(condition.exp, state.scope)) + ")?" + (genTernaryExp(condition.block)) + ":" + (genIfConditions(conditions, state, altGen, altEmpty)));
  } else {
    return ("" + (genTernaryExp(condition.block)));
  }

  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : genElement(el, state);
  }
}

function genFor(el, state, altGen, altHelper) {
  var obj;

  var exp = transformExpression(el.for, state.scope);
  var forItem = el.forItem;
  var forIndex = el.forIndex;

  if (process.env.NODE_ENV !== 'production'
    && state.maybeComponent(el)
    && el.tag !== 'slot'
    && el.tag !== 'template'
    && !el.key
  ) {
    state.warn(
      "<" + (el.tag) + " wx:for=\"{{" + exp + "}}\" wx:for-item=\"" + forItem + "\">: component lists rendered with "
      + 'wx:for should have explicit keys. '
      + 'See https://vuejs.org/guide/list.html#key for more info.',
      el.rawAttrsMap['wx:for'],
      true /* tip */
    );
  }

  el.forProcessed = true; // avoid recursion

  state.scope.push(makeScope(( obj = {}, obj[forItem] = true, obj[forIndex] = true, obj )));

  var code = (altHelper || '_l') + "((" + exp + "),"
    + "function(" + forItem + "," + forIndex + "){"
      + "return " + ((altGen || genElement)(el, state))
    + '})';

  if (state.scope.length > 1) {
    state.scope.pop();
  }

  return code;
}

function genData(el, state) {
  var data = '{';

  // key
  if (el.key) {
    // data += `key: ${transformExpression(el.key, state.scope)},`;
    data += "key: " + (el.key) + ",";
  }

  // module data generation functions
  for (var i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el, state);
  }
  // attributes
  if (el.attrs) {
    data += "attrs:" + (genProps(el.attrs, state)) + ",";
  }
  // DOM props
  if (el.props) {
    data += "domProps:" + (genProps(el.props, state)) + ",";
  }

  // event handlers
  if (el.events) {
    data += (genHandlers(el.events, state)) + ",";
  }

  // slot target
  // only for non-scoped slots
  if (el.slotTarget) {
    data += "slot: " + (transformExpression(el.slotTarget, state.scope)) + ",";
  }

  data = (data.replace(/,$/, '')) + "}";

  return data;
}

function genChildren(el, state, checkSkip, altGenElement, altGenNode) {
  var children = el.children;
  if (children.length) {
    var el$1 = children[0];
    // optimize single v-for
    if (children.length === 1
      && el$1.for
      && el$1.tag !== 'template'
      && el$1.tag !== 'slot'
    ) {
      var normalizationType = checkSkip
        ? state.maybeComponent(el$1) ? ',1' : ',0'
        : '';
      return ("" + ((altGenElement || genElement)(el$1, state)) + normalizationType);
    }

    var normalizationType$1 = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0;
    var gen = altGenNode || genNode;
    return ("[" + (children.map(function (c) { return gen(c, state); }).join(',')) + "]" + (normalizationType$1 ? ("," + normalizationType$1) : ''));
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType(children, maybeComponent) {
  var res = 0;
  for (var i = 0; i < children.length; i++) {
    var el = children[i];
    if (el.type !== 1) {
      continue;
    }
    if (needsNormalization(el)
        || (el.ifConditions && el.ifConditions.some(function (c) { return needsNormalization(c.block); }))) {
      res = 2;
      break;
    }
    if (maybeComponent(el)
        || (el.ifConditions && el.ifConditions.some(function (c) { return maybeComponent(c.block); }))) {
      res = 1;
    }
  }
  return res;
}

function needsNormalization(el) {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot';
}

function genNode(node, state) {
  if (node.type === 1) {
    return genElement(node, state);
  } else if (node.type === 3 && node.isComment) {
    return genComment(node);
  } else {
    return genText(node, state);
  }
}

function genText(text, state) {
  return ("_v(" + (text.type === 2
    ? transformText(text.expression, state.scope) // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))) + ")");
}

function genComment(comment) {
  return ("_e(" + (JSON.stringify(comment.text)) + ")");
}

function genSlot(el, state) {
  var slotName = transformExpression(el.slotName);
  var children = genChildren(el, state);
  var res = "_t(_x, " + slotName + (children ? (",function(){return " + children + "}") : '');
  var attrs = el.attrs
    ? genProps((el.attrs || []).map(function (attr) { return ({
      // slot props are camelized
      name: camelize(attr.name),
      value: attr.value,
    }); }))
    : null;

  if ((attrs) && !children) {
    res += ',null';
  }
  if (attrs) {
    res += "," + attrs;
  }

  return (res + ")");
}

function genWxs(el, state) {
  var src = el.src;
  var module = el.module;

  if (src && module) {
    state.wxs.push(("import " + module + " from '" + src + "';"));
    state.rootScope[module] = 'wxs';
  }

  return '_e()';
}

function genTemplate(el, state) {
  var exp;
  if (exp = el.templateIs) {
    var is = transformExpression(exp, state.scope);
    var data = (exp = el.templateData) ? transformExpression(exp = el.templateData, state.scope, { forceObject: true }) : '{}';

    return ("$renderTemplate($templates[" + is + "], " + data + ", _x)");
  } else if (el.templateDefine) {
    // 拿到children
    var children = genChildren(el, state, true);
    var code = "_c('fragment'" + (children ? ("," + children) : '') + ")";

    state.innerTpls[el.templateDefine] = genRenderFn(code);

    return '_e()';
  }
}

function genImport(el, state) {
  if (el.src) {
    state.importTplDeps.push(el.src);
  }

  return '_e()';
}

function genInclude(el, state) {
  var code = '_e()';
  if (el.src) {
    code = "require('" + (el.src) + "').render(_a, _x)";
  }

  return code;
}

function genProps(props, state) {
  var staticProps = '';

  for (var i = 0; i < props.length; i++) {
    var prop = props[i];
    var value = transformExpression(prop.value, state.scope);
    staticProps += "\"" + (prop.name) + "\":" + value + ",";
  }

  staticProps = "{" + (staticProps.slice(0, -1)) + "}";

  return staticProps;
}

// #3895, #4268
function transformSpecialNewlines(text) {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

var LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'errorCaptured',
  'serverPrefetch' ];

var config = ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  isReservedTag: isReservedTag,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: makeMap('style,class'),

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: isUnknownElement,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: getTagNamespace,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
  async: true,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS,
});

var warn$1 = noop;
var tip = noop;
var generateComponentTrace = (noop); // work around flow check
var formatComponentName = (noop);

if (process.env.NODE_ENV !== 'production') {
  var hasConsole = typeof console !== 'undefined';
  var classifyRE = /(?:^|[-_])(\w)/g;
  var classify = function (str) { return str
    .replace(classifyRE, function (c) { return c.toUpperCase(); })
    .replace(/[-_]/g, ''); };

  warn$1 = function (msg, vm) {
    var trace = vm ? generateComponentTrace(vm) : '';

    if (hasConsole && (!config.silent)) {
      console.error(("[Vue warn]: " + msg + trace));
    }
  };

  tip = function (msg, vm) {
    if (hasConsole && (!config.silent)) {
      console.warn(("[Vue tip]: " + msg + (vm ? generateComponentTrace(vm) : '')));
    }
  };

  formatComponentName = function (vm, includeFile) {
    if (vm.$root === vm) {
      return '<Root>';
    }
    var options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm;
    var name = options.name || options._componentTag;
    var file = options.__file;
    if (!name && file) {
      var match = file.match(/([^/\\]+)\.vue$/);
      name = match && match[1];
    }

    return (
      (name ? ("<" + (classify(name)) + ">") : '<Anonymous>')
      + (file && includeFile !== false ? (" at " + file) : '')
    );
  };

  var repeat = function (str, n) {
    var res = '';
    while (n) {
      if (n % 2 === 1) { res += str; }
      if (n > 1) { str += str; }
      n >>= 1;
    }
    return res;
  };

  generateComponentTrace = function (vm) {
    if (vm._isVue && vm.$parent) {
      var tree = [];
      var currentRecursiveSequence = 0;
      while (vm) {
        if (tree.length > 0) {
          var last = tree[tree.length - 1];
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++;
            vm = vm.$parent;
            continue;
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence];
            currentRecursiveSequence = 0;
          }
        }
        tree.push(vm);
        vm = vm.$parent;
      }
      return ("\n\nfound in\n\n" + (tree
        .map(function (vm, i) { return ("" + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm)
            ? ((formatComponentName(vm[0])) + "... (" + (vm[1]) + " recursive calls)")
            : formatComponentName(vm))); })
        .join('\n')));
    } else {
      return ("\n\n(found in " + (formatComponentName(vm)) + ")");
    }
  };
}

var range = 2;

function generateCodeFrame(source, start, end) {
  if ( start === void 0 ) start = 0;
  if ( end === void 0 ) end = source.length;

  var lines = source.split(/\r?\n/);
  var count = 0;
  var res = [];
  for (var i = 0; i < lines.length; i++) {
    count += lines[i].length + 1;
    if (count >= start) {
      for (var j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) { continue; }
        res.push(("" + (j + 1) + (repeat$1(' ', 3 - String(j + 1).length)) + "|  " + (lines[j])));
        var lineLength = lines[j].length;
        if (j === i) {
          // push underline
          var pad = start - (count - lineLength) + 1;
          var length = end > count ? lineLength - pad : end - start;
          res.push(("   |  " + (repeat$1(' ', pad)) + (repeat$1('^', length))));
        } else if (j > i) {
          if (end > count) {
            var length$1 = Math.min(end - count, lineLength);
            res.push(("   |  " + (repeat$1('^', length$1))));
          }
          count += lineLength + 1;
        }
      }
      break;
    }
  }
  return res.join('\n');
}

function repeat$1(str, n) {
  var result = '';
  if (n > 0) {
    while (true) { // eslint-disable-line
      if (n & 1) { result += str; }
      n >>>= 1;
      if (n <= 0) { break; }
      str += str;
    }
  }
  return result;
}

function createFunction(code, errors) {
  try {
    return new Function(("" + code));
  } catch (err) {
    errors.push({ err: err, code: code });
    return noop;
  }
}

function createCompileToFunctionFn(compile) {
  var cache = Object.create(null);

  return function compileToFunctions(template, options, vm) {
    options = extend({}, options);
    var warn = options.warn || warn$1;
    delete options.warn;

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // detect possible CSP restriction
      try {
        new Function('return 1');
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an '
            + 'environment with Content Security Policy that prohibits unsafe-eval. '
            + 'The template compiler cannot work in this environment. Consider '
            + 'relaxing the policy to allow unsafe-eval or pre-compiling your '
            + 'templates into render functions.'
          );
        }
      }
    }

    // check cache
    var key = options.delimiters
      ? String(options.delimiters) + template
      : template;
    if (cache[key]) {
      return cache[key];
    }

    // compile
    var compiled = compile(template, options);

    // check compilation errors/tips
    if (process.env.NODE_ENV !== 'production') {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(function (e) {
            warn(
              ("Error compiling template:\n\n" + (e.msg) + "\n\n" + (generateCodeFrame(template, e.start, e.end))),
              vm
            );
          });
        } else {
          warn(
            ("Error compiling template:\n\n" + template + "\n\n" + (compiled.errors.map(function (e) { return ("- " + e); }).join('\n')) + "\n"),
            vm
          );
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(function (e) { return tip(e.msg, vm); });
        } else {
          compiled.tips.forEach(function (msg) { return tip(msg, vm); });
        }
      }
    }

    // turn code into functions
    var res = {};
    var fnGenErrors = [];
    res.render = createFunction(compiled.render, fnGenErrors);
    res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
      return createFunction(code, fnGenErrors);
    });

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          ("Failed to generate render function:\n\n" + (fnGenErrors.map(function (ref) {
              var err = ref.err;
              var code = ref.code;

              return ((err.toString()) + " in\n\n" + code + "\n");
        }).join('\n'))),
          vm
        );
      }
    }

    return (cache[key] = res);
  };
}

function createCompilerCreator(baseCompile) {
  return function createCompiler(baseOptions) {
    // 调用时执行函数
    function compile(template, options) {
      var finalOptions = Object.create(baseOptions);
      var errors = [];
      var tips = [];

      var warn = function (msg, range, tip) {
        (tip ? tips : errors).push(msg);
      };

      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          var leadingSpaceLength = template.match(/^\s*/)[0].length;

          warn = function (msg, range, tip) {
            var data = { msg: msg };
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength;
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength;
              }
            }
            (tip ? tips : errors).push(data);
          };
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules = (baseOptions.modules || []).concat(options.modules);
        }
        // copy other options
        for (var key in options) {
          if (key !== 'modules') {
            finalOptions[key] = options[key];
          }
        }
      }

      finalOptions.warn = warn;

      var compiled = baseCompile(template.trim(), finalOptions);
      compiled.errors = errors;
      compiled.tips = tips;
      return compiled;
    }

    return {
      compile: compile,
      compileToFunctions: createCompileToFunctionFn(compile),
    };
  };
}

function transformNode(el) {
  var exp = getAndRemoveAttr(el, 'class');

  if (exp) {
    if (hasExpression(exp)) {
      el.classBinding = exp;
    } else {
      el.staticClass = JSON.stringify(exp.replace(/\s+/g, ' ').trim());
    }
  }
}

function genData$1(el, state) {
  var data = '';
  if (el.staticClass) {
    data += "staticClass:" + (el.staticClass) + ",";
  }
  if (el.classBinding) {
    data += "class:" + (transformExpression(el.classBinding, state.scope)) + ",";
  }
  return data;
}

var klass = {
  staticKeys: ['staticClass'],
  transformNode: transformNode,
  genData: genData$1,
};

function transformNode$1(el) {
  var exp = getAndRemoveAttr(el, 'style');

  if (exp) {
    if (hasExpression(exp)) {
      el.styleBinding = exp;
    } else {
      el.staticStyle = JSON.stringify(parseStyleText(exp));
    }
  }
}

function genData$2(el, state) {
  var data = '';
  if (el.staticStyle) {
    data += "staticStyle:" + (el.staticStyle) + ",";
  }
  if (el.styleBinding) {
    data += "style:(" + (transformExpression(el.styleBinding, state.scope)) + "),";
  }
  return data;
}

var style = {
  staticKeys: ['staticStyle'],
  transformNode: transformNode$1,
  genData: genData$2,
};

var modules = [
  klass,
  style ];

var baseOptions = {
  expectHTML: true,
  modules: modules,
  isPreTag: isPreTag,
  isUnaryTag: isUnaryTag,
  canBeLeftOpenTag: canBeLeftOpenTag,
  isReservedTag: isReservedTag,
  getTagNamespace: getTagNamespace,
  staticKeys: genStaticKeys(modules),
};

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
var createCompiler = createCompilerCreator(function (template, options) {
  // 生成template ast
  var ast = parse(("<block>" + template + "</block>"), options);

  // 优化
  if (options.optimize !== false) {
    optimize(ast, options);
  }

  // 生成code
  var code = generate(ast, options);

  return {
    ast: ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
    header: code.header,
  };
});

var ref = createCompiler(baseOptions);
var compile = ref.compile;
var compileToFunctions = ref.compileToFunctions;

exports.compile = compile;
exports.compileToFunctions = compileToFunctions;
