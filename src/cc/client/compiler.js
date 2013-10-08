define(function(require, exports, module) {
  "use strict";

  var bop = require("../server/bop");

  var CoffeeScript = (function() {
    if (global.CoffeeScript) {
      return global.CoffeeScript;
    }
    try {
      return require(["coffee-script"][0]);
    } catch(e) {}
  })();

  var Compiler = (function() {
    var TAG = 0, VALUE = 1, _ = {};
    function Compiler() {
    }
    Compiler.prototype.compile = function(code) {
      var tokens = CoffeeScript.tokens(code);
      tokens = this.doPI(tokens);
      tokens = this.doBOP(tokens);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
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
    Compiler.prototype.doBOP = (function() {
      var CALL = 0, BRACKET = 1;
      var REPLACE = bop.replaceTable;
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
          if (replaceable && REPLACE[token[VALUE]]) {
            beginCall(dstTokens, REPLACE[token[VALUE]]);
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
    return Compiler;
  })();

  module.exports = {
    Compiler: Compiler
  };

});
