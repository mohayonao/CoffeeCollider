define(function(require, exports, module) {
  "use strict";

  var CoffeeScript = (function() {
    if (global.CoffeeScript) {
      return global.CoffeeScript;
    }
    try {
      return require(["coffee-script"][0]);
    } catch(e) {}
  })();

  // CoffeeScript tags
  // IDENTIFIER
  // NUMBER
  // STRING
  // REGEX
  // BOOL
  // NULL
  // UNDEFINED
  // COMPOUND_ASSIGN -=, +=, div=, *=, %=, ||=, &&=, ?=, <<=, >>=, >>>=, &=, ^=, |=
  // UNARY           !, ~, new, typeof, delete, do
  // LOGIC           &&, ||, &, |, ^
  // SHIFT           <<, >>, >>>
  // COMPARE         ==, !=, <, >, <=, >=
  // MATH            *, div, %, 
  // RELATION        in, of, instanceof
  // =
  // +
  // -
  // ..
  // ...
  // ++
  // --
  // (
  // )
  // [
  // ]
  // {
  // }
  // ?
  // ::
  // @
  // THIS
  // SUPER
  // INDENT
  // OUTDENT
  // TERMINATOR

  var Compiler = (function() {
    var TAG = 0, VALUE = 1, _ = {};
    function Compiler() {
    }
    Compiler.prototype.tokens = function(code) {
      var tokens = CoffeeScript.tokens(code);
      tokens = this.doPI(tokens);
      tokens = this.doPrecedence(tokens);
      tokens = this.doBOP(tokens);
      return tokens;
    };
    Compiler.prototype.compile = function(code) {
      var tokens = this.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    Compiler.prototype.toString = (function() {
      var tab = function(n) {
        var t = "";
        while (n--) {
          t += " ";
        }
        return t;
      };
      return function(tokens) {
        var indent = 0;
        if (typeof tokens === "string") {
          tokens = this.tokens(tokens);
        }
        return tokens.map(function(token) {
          switch (token[TAG]) {
          case "TERMINATOR":
            return "\n" + tab(indent);
          case "INDENT":
            indent += token[VALUE]|0;
            return "\n" + tab(indent);
          case "OUTDENT":
            indent -= token[VALUE]|0;
            return "\n" + tab(indent);
          case ",":
            return token[VALUE] + " ";
          default:
            return token[VALUE];
          }
        }).join("").trim();
      };
    })();
    Compiler.prototype.doPI = function(tokens) {
      var i, token, prev = [];
      i = 0;
      while (i < tokens.length) {
        token = tokens[i];
        if (token[VALUE] === "pi") {
          tokens.splice(i, 1);
          if (prev[TAG] === "NUMBER") {
            tokens.splice(i++, 0, ["MATH", "*", _]);
          }
          tokens.splice(i++, 0, ["IDENTIFIER", "Math", _]);
          tokens.splice(i++, 0, ["."         , "."   , _]);
          tokens.splice(i  , 0, ["IDENTIFIER", "PI"  , _]);
        }
        prev = tokens[i++];
      }
      return tokens;
    };
    Compiler.prototype.doPrecedence = (function() {
      var find = function(tokens, index, vector) {
        var bracket = 0;
        index += vector;
        while (0 < index && index < tokens.length) {
          var token;
          token = tokens[index + vector];
          if (!token || token[TAG] !== ".") {
            token = tokens[index];
            switch (token[TAG]) {
            case "TERMINATOR":
              return index - 1;
            case "IDENTIFIER":
              if (vector === +1) {
                token = tokens[index + 1];
                if (token && token[TAG] === "CALL_START") {
                  bracket += 1;
                  break;
                }
              }
              if (bracket === 0) {
                return index;
              }
              break;
            case "NUMBER": case "STRING": case "BOOL":
            case "REGEX": case "NULL": case "UNDEFINED":
              if (bracket === 0) {
                return index;
              }
              break;
            case "(": case "[": case "{":
              bracket += vector;
              break;
            case "}": case "]": case ")":
              bracket -= vector;
              break;
            case "CALL_END":
              bracket -= vector;
              if (bracket === 0) {
                return index;
              }
              break;
            }
          }
          index += vector;
        }
        return Math.max(0, Math.min(index, tokens.length - 1));
      };
      return function(tokens) {
        var i;
        i = 0;
        while (i < tokens.length) {
          var token = tokens[i];
          if (token[TAG] === "MATH") {
            var a = find(tokens, i , -1);
            var b = find(tokens, i , +1) + 1;
            tokens.splice(b, 0, [")", ")" , _]);
            tokens.splice(a, 0, ["(", "(" , _]);
            i += 1;
          }
          i += 1;
        }
        // Compiler.dumpTokens(tokens);
        return tokens;
      };
    })();
    Compiler.prototype.doBOP = (function() {
      var CALL = 0, BRACKET = 1;
      var replaceTable = {
        "+": "__add__",
        "-": "__sub__",
        "*": "__mul__",
        "/": "__div__",
        "%": "__mod__",
      };
      var peek = function(list) {
        return list[list.length - 1];
      };
      var pop = function(list) {
        list.pop();
        return list[list.length - 1];
      };
      var push = function(list, item) {
        list.push(item);
        return list[list.length - 1];
      };
      var beginCall = function(dst, sel) {
        dst.push(["."         , ".", _]);
        dst.push(["IDENTIFIER", sel, _]);
        dst.push(["CALL_START", "(", _]);
      };
      var closeCall = function(dst) {
        dst.push(["CALL_END", ")", _]);
      };
      return function(tokens) {
        var dstTokens = [], bracketStack = [];
        var bracket, token, replaceable = false;
        while ((token = tokens.shift())) {
          if (replaceable && replaceTable[token[VALUE]]) {
            beginCall(dstTokens, replaceTable[token[VALUE]]);
            bracket = { type:CALL };
            push(bracketStack, bracket);
            replaceable = false;
            continue;
          }
          replaceable = true;
          bracket = peek(bracketStack);
          switch (token[TAG]) {
          case ",": case "TERMINATOR": case "INDENT": case "OUTDENT":
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens);
              bracket = pop(bracketStack);
            }
            replaceable = false;
            break;
          case "CALL_START": case "(": case "[": case "{":
            push(bracketStack, {type:BRACKET});
            replaceable = false;
            break;
          case "}": case "]": case ")": case "CALL_END":
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens);
              bracket = pop(bracketStack);
            }
            if (bracket && bracket.type === BRACKET) {
              dstTokens.push(token);
              bracket = pop(bracketStack);
            }
            while (bracket && bracket.type === CALL) {
              closeCall(dstTokens, bracket);
              bracket = pop(bracketStack);
            }
            continue;
          }
          dstTokens.push(token);
        }
        return dstTokens;
      };
    })();
    Compiler.dumpTokens = function(tokens) {
      console.log(tokens.map(function(t) {
        return t[0] + "\t" + t[1];
      }).join("\n"));
    };
    return Compiler;
  })();


  module.exports = {
    Compiler: Compiler
  };

});
