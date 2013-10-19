define(function(require, exports, module) {
  "use strict";

  var UGen = require("./ugen/ugen").UGen;
  var UnaryOpUGen = require("./ugen/basic_ops").UnaryOpUGen;
  
  var setupFunction = function(func) {
    return function() {
      return func(this);
    };
  };
  var setupArrayFunction = function(selector) {
    return function() {
      return this.map(function(x) {
        return x[selector]();
      });
    };
  };
  var setupUGenFunction = function(selector) {
    return function() {
      return new UnaryOpUGen(selector, this);
    };
  };

  var setup = function(selector, func, others) {
    func = setupFunction(func);
    Number.prototype[selector] = func;
    Array.prototype[selector]  = setupArrayFunction(selector);
    UGen.prototype[selector]   = setupUGenFunction(selector);
    if (others) {
      String.prototype[selector]   = func;
      Boolean.prototype[selector]  = func;
      Function.prototype[selector] = func;
    }
  };
  
  var install = function() {
    setup("num", function(a) {
      return +a;
    }, true);
    
    setup("neg", function(a) {
      return -a;
    }, true);

    setup("not", function(a) {
      return !a;
    }, true);
    
    setup("tilde", function(a) {
      return ~a;
    }, true);
  };

  module.exports = {
    install: install
  };

});
