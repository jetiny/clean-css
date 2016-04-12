var all = require('./helpers').all;

function store(token, context) {
  context.output.push(typeof token == 'string' ? token : token[0]);
}

function stringify(tokens, options, restoreCallback) {
  var context = {
    keepBreaks: options.keepBreaks,
    output: [],
    spaceAfterClosingBrace: options.compatibility.properties.spaceAfterClosingBrace,
    store: store
  };

  all(tokens, context, false);
  require('./sass').parseSelector(tokens);

  return {
    styles: restoreCallback(context.output.join("")).trim()
  };
}

module.exports = stringify;
