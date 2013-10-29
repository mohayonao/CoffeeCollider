define(function(require, exports, module) {
  "use strict";

  var cc = require("../../cc");
  var coffee = require("./coffee");

  var install = function() {
    coffee.install();
    cc.createCompiler = function(lang) {
      if (lang === "coffee") {
        return cc.createCoffeeCompiler();
      }
    };
  };
  
  module.exports = {
    install: install
  };

});
