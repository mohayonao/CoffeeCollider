define(function(require, exports, module) {
  "use strict";

  var utils = require("./utils");
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
        return new BinaryOpUGen().init(ugenSelector, this, b);
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
    Number.prototype[selector] = setupNumberFunction(func, selector, ugenSelector);
    Array.prototype[selector]  = setupArrayFunction(selector, ugenSelector);
    UGen.prototype[selector]   = setupUGenFunction(ugenSelector);
  };

  var install = function() {
    setup("__add__", function(a, b) {
      return a + b;
    }, "+");
    String.prototype.__add__ = function(b) {
      return this + b;
    };
    Function.prototype.__add__ = function(b) {
      return this + b;
    };

    setup("__sub__", function(a, b) {
      return a - b;
    }, "-");
    
    setup("__mul__", function(a, b) {
      return a * b;
    }, "*");
    String.prototype.__mul__ = function(b) {
      if (typeof b === "number") {
        var result = new Array(Math.max(0, b));
        for (var i = 0; i < b; i++) {
          result[i] = this;
        }
        return result.join("");
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mul__(b);
        }, this);
      }
      return new TypeError("String *: an invalid operand.");
    };
    Function.prototype.__mul__ = function(b) {
      if (typeof b === "function") {
        var f = this, g = b;
        return function() {
          return f.call(null, g.apply(null, arguments));
        };
      }
      return this;
    };
    
    setup("__div__", function(a, b) {
      return a / b;
    }, "/");
    String.prototype.__div__ = function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__div__(b);
        }, this);
      }
      return new TypeError("String /: an invalid operand.");
    };

    setup("__mod__", function(a, b) {
      return a % b;
    }, "%");
    String.prototype.__mod__ = function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), b|0).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mod__(b);
        }, this);
      }
      return new TypeError("String %: an invalid operand.");
    };
  };
  
  module.exports = {
    install: install,
  };

});
