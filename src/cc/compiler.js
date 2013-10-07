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

  var Compiler = (function() {
    function Compiler() {
    }
    Compiler.prototype.compile = function(code) {
      var tokens = CoffeeScript.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true});
    };
    return Compiler;
  })();

  module.exports = {
    Compiler: Compiler
  };

});
