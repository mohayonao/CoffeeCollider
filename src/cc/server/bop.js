define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var UGen  = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  var setupNumberFunction = function(func, selector, ugenSelector) {
    return function(b) {
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return this[selector](b);
        }, this);
      } else if (b instanceof UGen) {
        return new BinaryOpUGen().init(ugenSelector, this, b);
      }
      return func(this, b);
    };
  };
  var setupArrayFunction = function(selector, ugenSelector) {
    return function(b) {
      var a = this;
      if (Array.isArray(b)) {
        if (a.length === b.length) {
          return a.map(function(a, index) {
            return a[selector](b[index]);
          });
        } else if (a.length > b.length) {
          return a.map(function(a, index) {
            return a[selector](b[index % b.length]);
          });
        } else {
          return b.map(function(b, index) {
            return a[index % a.length][selector](b);
          });
        }
      } else if (b instanceof UGen) {
        return a.map(function(a) {
          return new BinaryOpUGen().init(ugenSelector, a, b);
        });
      }
      return a.map(function(a) {
        return a[selector](b);
      });
    };
  };
  var setupUGenFunction = function(selector) {
    return function(b) {
      return new BinaryOpUGen().init(selector, this, b);
    };
  };

  var setup = function(selector, func, ugenSelector) {
    ugenSelector = ugenSelector || selector;
    fn.definePrototypeProperty(
      Number, selector, setupNumberFunction(func, selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      Array, selector, setupArrayFunction(selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      UGen, selector, setupUGenFunction(ugenSelector)
    );
  };
  
  var install = function() {
    setup("__add__", function(a, b) {
      return a + b;
    }, "+");
    setup("__sub__", function(a, b) {
      return a - b;
    }, "-");
    setup("__mul__", function(a, b) {
      return a * b;
    }, "*");
    setup("__div__", function(a, b) {
      return a / b;
    }, "/");
    setup("__mod__", function(a, b) {
      return a % b;
    }, "%");
  };
  
  module.exports = {
    install: install,
  };

});
