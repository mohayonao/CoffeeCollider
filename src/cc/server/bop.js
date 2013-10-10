define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    var nonCastFunc = function(key, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[key](b);
          }, this);
        }
        return func(this, b);
      };
    };
    var numCastFunc = function(key, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return (+this)[key](b);
          }, this);
        }
        return func(+this, b);
      };
    };
    
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      Number.prototype[key] = nonCastFunc(key, func);
      if (calcFunc[key].array) {
        func = calcFunc[key];
      }
      Array.prototype[key] = function(b) {
        var a = this;
        if (Array.isArray(b)) {
          return b.map(function(b, index) {
            return a[index % a.length][key](b);
          });
        }
        return a.map(function(a) {
          return a[key](b);
        });
      };
      if (calcFunc[key].bool) {
        func = calcFunc[key];
        Boolean.prototype[key] = nonCastFunc(key, func);
      } else {
        Boolean.prototype[key] = numCastFunc(key, func);
      }
      if (calcFunc[key].str) {
        func = calcFunc[key].str;
        String.prototype[key] = nonCastFunc(key, func);
      } else {
        String.prototype[key] = numCastFunc(key, func);
      }
      if (namespace && namespace.register) {
        namespace.register(key);
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
