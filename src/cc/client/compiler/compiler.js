define(function(require, exports, module) {
  "use strict";

  var cc = require("../../cc");
  
  var use = function() {
    require("./coffee");
    
    cc.createCompiler = function(lang) {
      if (lang === "coffee") {
        return cc.createCoffeeCompiler();
      }
      throw new TypeError("Compiler: '" + lang + "' not supported");
    };
  };
  
  module.exports = {
    use:use
  };

  module.exports.use();

});
