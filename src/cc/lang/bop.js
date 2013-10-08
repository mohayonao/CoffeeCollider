define(function(require, exports, module) {
  "use strict";

  var install = function() {
    var scalarFunc = function(selector, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[selector](b);
          }, this);
        }
        return func(this, b);
      };
    };
    var arrayFunc = function(selector) {
      return function(b) {
        var a = this;
        if (Array.isArray(b)) {
          return b.map(function(b, index) {
            return a[index % a.length][selector](b);
          });
        }
        return a.map(function(a) {
          return a[selector](b);
        });
      };
    };
    
    Number.prototype.__add__ = scalarFunc("__add__", function(a, b) {
      return a + b;
    });
    Number.prototype.__sub__ = scalarFunc("__sub__", function(a, b) {
      return a - b;
    });
    Number.prototype.__mul__ = scalarFunc("__mul__", function(a, b) {
      return a * b;
    });
    Number.prototype.__div__ = scalarFunc("__div__", function(a, b) {
      return a / b;
    });
    Number.prototype.__mod__ = scalarFunc("__mod__", function(a, b) {
      return a % b;
    });
    Array.prototype.__add__ = arrayFunc("__add__");
    Array.prototype.__sub__ = arrayFunc("__sub__");
    Array.prototype.__mul__ = arrayFunc("__mul__");
    Array.prototype.__div__ = arrayFunc("__div__");
    Array.prototype.__mod__ = arrayFunc("__mod__");
    
    String.prototype.__add__ = scalarFunc("__add__", function(a, b) {
      return a + b;
    });
    String.prototype.__mul__ = scalarFunc("__mul__", function(a, b) {
      if (typeof b === "number") {
        var list = new Array(b);
        for (var i = 0; i < b; i++) {
          list[i] = a;
        }
        return list.join("");
      }
      return a;
    });
  };

  var replaceTable = {
    "+": "__add__",
    "-": "__sub__",
    "*": "__mul__",
    "/": "__div__",
    "%": "__mod__",
  };
  
  module.exports = {
    install: install,
    replaceTable: replaceTable
  };

});
