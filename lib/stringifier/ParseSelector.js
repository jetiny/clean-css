function isIdentStart(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isIdent(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '-' || c === '_';
}

function isHex(c) {
    return (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || (c >= '0' && c <= '9');
}

function isDecimal(c) {
    return c >= '0' && c <= '9';
}

function isAttrMatchOperator(c) {
    return c === '=' || c === '^' || c === '$' || c === '*' || c === '~';
};

var identSpecialChars = {
    '!': true,
    '"': true,
    '#': true,
    '$': true,
    '%': true,
    '&': true,
    '\'': true,
    '(': true,
    ')': true,
    '*': true,
    '+': true,
    ',': true,
    '.': true,
    '/': true,
    ';': true,
    '<': true,
    '=': true,
    '>': true,
    '?': true,
    '@': true,
    '[': true,
    '\\': true,
    ']': true,
    '^': true,
    '`': true,
    '{': true,
    '|': true,
    '}': true,
    '~': true
};

var identReplacements = {
    'n': '\n',
    'r': '\r',
    't': '\t',
    ' ': ' ',
    'f': '\f',
    'v': '\v'
};

var identReplacementsRev = {
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    ' ': '\\ ',
    '\f': '\\f',
    '\v': '\\v'
};

var strReplacementsRev = {
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\f': '\\f',
    '\v': '\\v'
};

var singleQuoteEscapeChars = {
    n: '\n',
    r: '\r',
    t: '\t',
    f: '\f',
    '\\': '\\',
    '\'': '\''
};

var doubleQuotesEscapeChars = {
    n: '\n',
    r: '\r',
    t: '\t',
    f: '\f',
    '\\': '\\',
    '"': '"'
};

function ParseContext(str, p, pseudos, attrEqualityMods, ruleNestingOperators, substitutesEnabled) {
    var c, getIdent, getStr, l, skipWhitespace;
    l = str.length;
    c = null;
    getStr = function(quote, escapeTable) {
        var esc, hex, result;
        result = '';
        p++;
        c = str.charAt(p);
        while (p < l) {
            if (c === quote) {
                p++;
                return result;
            } else if (c === '\\') {
                p++;
                c = str.charAt(p);
                if (c === quote) {
                    result += quote;
                } else if (esc = escapeTable[c]) {
                    result += esc;
                } else if (isHex(c)) {
                    hex = c;
                    p++;
                    c = str.charAt(p);
                    while (isHex(c)) {
                        hex += c;
                        p++;
                        c = str.charAt(p);
                    }
                    if (c === ' ') {
                        p++;
                        c = str.charAt(p);
                    }
                    result += String.fromCharCode(parseInt(hex, 16));
                    continue;
                } else {
                    result += c;
                }
            } else {
                result += c;
            }
            p++;
            c = str.charAt(p);
        }
        return result;
    };
    getIdent = function() {
        var hex, r, result;
        result = '';
        c = str.charAt(p);
        while (p < l) {
            if (isIdent(c)) {
                result += c;
            } else if (c === '\\') {
                p++;
                c = str.charAt(p);
                if (identSpecialChars[c]) {
                    result += c;
                } else if (r = identReplacements[c]) {
                    result += r;
                } else if (isHex(c)) {
                    hex = c;
                    p++;
                    c = str.charAt(p);
                    while (isHex(c)) {
                        hex += c;
                        p++;
                        c = str.charAt(p);
                    }
                    if (c === ' ') {
                        p++;
                        c = str.charAt(p);
                    }
                    result += String.fromCharCode(parseInt(hex, 16));
                    continue;
                } else {
                    result += c;
                }
            } else {
                return result;
            }
            p++;
            c = str.charAt(p);
        }
        return result;
    };
    skipWhitespace = function() {
        var result;
        c = str.charAt(p);
        result = false;
        while (c === ' ' || c === "\t" || c === "\n" || c === "\r" || c === "\f") {
            result = true;
            p++;
            c = str.charAt(p);
        }
        return result;
    };
    this.parse = function() {
        var res;
        res = this.parseSelector();
        if (p < l) {
            throw Error('Rule expected but "' + str.charAt(p) + '" found.');
        }
        return res;
    };
    this.parseSelector = function() {
        var res, selector;
        selector = res = this.parseSingleSelector();
        c = str.charAt(p);
        while (c === ',') {
            p++;
            skipWhitespace();
            if (res.type !== 'selectors') {
                res = {
                    type: 'selectors',
                    selectors: [selector]
                };
            }
            selector = this.parseSingleSelector();
            if (!selector) {
                throw Error('Rule expected after ",".');
            }
            res.selectors.push(selector);
        }
        return res;
    };
    this.parseSingleSelector = function() {
        var currentRule, op, rule, selector;
        skipWhitespace();
        selector = {
            type: 'ruleSet'
        };
        rule = this.parseRule();
        if (!rule) {
            return null;
        }
        currentRule = selector;
        while (rule) {
            rule.type = 'rule';
            currentRule.rule = rule;
            currentRule = rule;
            skipWhitespace();
            c = str.charAt(p);
            if (p >= l || c === ',' || c === ')') {
                break;
            }
            if (ruleNestingOperators[c]) {
                op = c;
                p++;
                skipWhitespace();
                rule = this.parseRule();
                if (!rule) {
                    throw Error('Rule expected after "' + op + '".');
                }
                rule.nestingOperator = op;
            } else {
                rule = this.parseRule();
                if (rule) {
                    rule.nestingOperator = null;
                }
            }
        }
        return selector;
    };
    this.parseRule = function() {
        var attr, attrValue, escapedCharacter, followingCharacter, id, operator, pseudo, pseudoName, rule, value;
        rule = null;
        while (p < l) {
            c = str.charAt(p);
            if (c === '*') {
                p++;
                (rule = rule || {}).tagName = '*';
            } else if (isIdentStart(c) || c === '\\') {
                (rule = rule || {}).tagName = getIdent();
            } else if (c === '.') {
                p++;
                rule = rule || {};
                (rule.classNames = rule.classNames || []).push(getIdent());
            } else if (c === '#') {
                p++;
                c = str.charAt(p);
                id = '';
                while (c === '\\' || isIdent(c)) {
                    if (c === '\\') {
                        p++;
                        if (p >= l) {
                            throw Error('Expected symbol but end of file reached.');
                        }
                        escapedCharacter = str.charAt(p);
                        while (p < l && escapedCharacter === '0') {
                            p++;
                            escapedCharacter = str.charAt(p);
                        }
                        if (escapedCharacter === '3') {
                            p++;
                            if (p < l) {
                                id += str.charAt(p);
                                p++;
                                followingCharacter = str.charAt(p);
                                if (followingCharacter === ' ') {
                                    p++;
                                    if (p < l) {
                                        id += str.charAt(p);
                                    }
                                } else {
                                    id += followingCharacter;
                                }
                            }
                        } else {
                            id += escapedCharacter;
                        }
                    } else {
                        id += c;
                    }
                    p++;
                    c = str.charAt(p);
                }
                (rule = rule || {}).id = id;
            } else if (c === '[') {
                p++;
                skipWhitespace();
                attr = {
                    name: getIdent()
                };
                skipWhitespace();
                if (c === ']') {
                    p++;
                } else {
                    operator = '';
                    if (attrEqualityMods[c]) {
                        operator = c;
                        p++;
                        c = str.charAt(p);
                    }
                    if (p >= l) {
                        throw Error('Expected "=" but end of file reached.');
                    }
                    if (c !== '=') {
                        throw Error('Expected "=" but "' + c + '" found.');
                    }
                    attr.operator = operator + '=';
                    p++;
                    skipWhitespace();
                    attrValue = '';
                    attr.valueType = 'string';
                    if (c === '"') {
                        attrValue = getStr('"', doubleQuotesEscapeChars);
                    } else if (c === '\'') {
                        attrValue = getStr('\'', singleQuoteEscapeChars);
                    } else if (substitutesEnabled && c === '$') {
                        p++;
                        attrValue = getIdent();
                        attr.valueType = 'substitute';
                    } else {
                        while (p < l) {
                            if (c === ']') {
                                break;
                            }
                            attrValue += c;
                            p++;
                            c = str.charAt(p);
                        }
                        attrValue = attrValue.trim();
                    }
                    skipWhitespace();
                    if (p >= l) {
                        throw Error('Expected "]" but end of file reached.');
                    }
                    if (c !== ']') {
                        throw Error('Expected "]" but "' + c + '" found.');
                    }
                    p++;
                    attr.value = attrValue;
                }
                rule = rule || {};
                (rule.attrs = rule.attrs || []).push(attr);
            } else if (c === ':') {
                p++;
                pseudoName = getIdent();
                if (pseudoName == '') { //@NOTE CC3伪元素 ::after
                    p++;
                    pseudoName = getIdent();
                }
                pseudo = {
                    name: pseudoName
                };
                if (c === '(') {
                    p++;
                    value = '';
                    skipWhitespace();
                    if (pseudos[pseudoName] === 'selector') {
                        pseudo.valueType = 'selector';
                        value = this.parseSelector();
                    } else {
                        pseudo.valueType = 'string';
                        if (c === '"') {
                            value = getStr('"', doubleQuotesEscapeChars);
                        } else if (c === '\'') {
                            value = getStr('\'', singleQuoteEscapeChars);
                        } else if (substitutesEnabled && c === '$') {
                            p++;
                            value = getIdent();
                            pseudo.valueType = 'substitute';
                        } else {
                            while (p < l) {
                                if (c === ')') {
                                    break;
                                }
                                value += c;
                                p++;
                                c = str.charAt(p);
                            }
                            value = value.trim();
                        }
                        skipWhitespace();
                    }
                    if (p >= l) {
                        throw Error('Expected ")" but end of file reached.');
                    }
                    if (c !== ')') {
                        throw Error('Expected ")" but "' + c + '" found.');
                    }
                    p++;
                    pseudo.value = value;
                }
                rule = rule || {};
                (rule.pseudos = rule.pseudos || []).push(pseudo);
            } else {
                break;
            }
        }
        return rule;
    };
    return this;
}

var options = ParseContext.options = {
    pseudos : {
        // 'has': true,
        // 'not': true,
    },
    attrEqualityMods:{
        '^':true,
        '$': true,
        '*': true,
        '~': true,
    },
    ruleNestingOperators: {
        '>':true,
        '+':true,
        '~':true,
    },
    substitutesEnabled: true
}

ParseContext.parse = function (str) {
    var context = new ParseContext(
        str,
        0,
        options.pseudos,
        options.attrEqualityMods,
        options.ruleNestingOperators,
        options.substitutesEnabled
    );
    return context.parse();
}

module.exports = ParseContext;