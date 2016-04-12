var ParseSelector = require('./ParseSelector');

/*

ID
Tag
.class
*
pseudos


 */
function processSelector(fields) {
	var selectors = fields[1], selector, rule;
	selectors.forEach(function (it) {
		selector = it[0];
		rule = ParseSelector.parse(selector).rule;
		//console.log(rule);
	});
}

function parseSelector(tokens) {
  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];
    switch (token[0]) {
      case 'block':
        processSelector(token[2]);
        break;
      case 'selector':
      	processSelector(token);
        break;
      default:
      	break;
    }
  }
}


exports.parseSelector = parseSelector;