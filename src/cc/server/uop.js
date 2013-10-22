define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var UGen = require("./ugen/ugen").UGen;
  var UnaryOpUGen = require("./ugen/basic_ops").UnaryOpUGen;
  
  var install = function() {
    fn.definePrototypeProperty(Array, "__plus__", function() {
      return this.map(function(x) {
        return x.__plus__();
      });
    });
    fn.definePrototypeProperty(UGen, "__plus__", function() {
      return new UnaryOpUGen("+", this);
    });
    fn.definePrototypeProperty(Array, "__minus__", function() {
      return this.map(function(x) {
        return x.__minus__();
      });
    });
    fn.definePrototypeProperty(UGen, "__minus__", function() {
      return new UnaryOpUGen("-", this);
    });
  };
  
  module.exports = {
    install: install
  };

});
