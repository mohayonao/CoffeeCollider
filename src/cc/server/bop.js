define(function(require, exports, module) {
  "use strict";

  var UGen = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  var aliases = {
    __add__: "+",
    __sub__: "-",
    __mul__: "*",
    __div__: "/",
    __mod__: "%",
  };

  var install = function() {
    Object.keys(calcFunc).forEach(function(key) {
      var keyForBop = aliases[key] || key;
      var func = calcFunc[key];
      Number.prototype[key] = function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[key](b);
          }, this);
        } else if (b instanceof UGen) {
          return BinaryOpUGen.new(keyForBop, this, b);
        }
        return func(this, b);
      };
      if (calcFunc[key].array) {
        func = calcFunc[key];
      }
      Array.prototype[key] = function(b) {
        var a = this;
        if (Array.isArray(b)) {
          if (a.length === b.length) {
            return a.map(function(a, index) {
              return a[key](b[index]);
            });
          } else if (a.length > b.length) {
            return a.map(function(a, index) {
              return a[key](b[index % b.length]);
            });
          } else {
            return b.map(function(b, index) {
              return a[index % a.length][key](b);
            });
          }
        } else if (b instanceof UGen) {
          return BinaryOpUGen.new(keyForBop, this, b);
        }
        return a.map(function(a) {
          return a[key](b);
        });
      };
      UGen.prototype[key] = function(b) {
        return BinaryOpUGen.new(keyForBop, this, b);
      };
      if (calcFunc[key].str) {
        var strFunc = calcFunc[key].str;
        String.prototype[key] = function(b) {
          if (Array.isArray(b)) {
            return b.map(function(b) {
              return this[key](b);
            }, this);
          }
          return strFunc(this, b);
        };
      }
    });
  };

  var calcFunc = {};

  calcFunc.__add__ = function(a, b) {
    return a + b;
  };
  calcFunc.__add__.str = calcFunc.__add__;
  calcFunc.__sub__ = function(a, b) {
    return a - b;
  };
  calcFunc.__mul__ = function(a, b) {
    return a * b;
  };
  calcFunc.__mul__.str = function(a, b) {
    if (typeof b === "number") {
      var list = new Array(Math.max(0, b));
      for (var i = 0; i < b; i++) {
        list[i] = a;
      }
      return list.join("");
    }
    return a;
  };
  calcFunc.__div__ = function(a, b) {
    return a / b;
  };
  calcFunc.__mod__ = function(a, b) {
    return a % b;
  };
  
  module.exports = {
    install: install,
  };

});
