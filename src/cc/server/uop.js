define(function(require, exports, module) {
  "use strict";

  var UGen = require("./ugen/ugen").UGen;
  var UnaryOpUGen = require("./ugen/basic_ops").UnaryOpUGen;
  
  var install = function() {
    Array.prototype.__plus__ = function() {
      return this.map(function(x) {
        return +x;
      });
    };
    UGen.prototype.__plus__ = function() {
      return new UnaryOpUGen("+", this);
    };
    Array.prototype.__minus__ = function() {
      return this.map(function(x) {
        return -x;
      });
    };
    UGen.prototype.__minus__ = function() {
      return new UnaryOpUGen("-", this);
    };
  };

  module.exports = {
    install: install
  };

});
