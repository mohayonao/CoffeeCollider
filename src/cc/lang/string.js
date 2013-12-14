define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var utils = require("./utils");
  var ops = require("../common/ops");
  var numericstring = require("../common/numericstring");
  var timevalue = numericstring.timevalue;
  var notevalue = numericstring.notevalue;
  var slice = [].slice;
  
  var asNumber = function(val) {
    val = +val;
    if (isNaN(val)) {
      return 0;
    }
    return val;
  };
  
  // common methods
  fn.defineProperty(String.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(String.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(String.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());

  fn.defineProperty(String.prototype, "do", function() {
    throw "not implemented";
  });
  
  fn.defineProperty(String.prototype, "wait", function() {
    return this;
  });
  
  fn.defineProperty(String.prototype, "asUGenInput", function() {
    return this;
  });
  
  // unary operator methods
  ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, function() {
      return asNumber(this)[selector]();
    });
  });

  // binary operator methods
  ["__sub__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, function(b) {
      return asNumber(this)[selector](b);
    });
  });
  fn.defineBinaryProperty(String.prototype, "__add__", function(b) {
    return this + b.toString();
  });
  
  var repeat = (function() {
    var _repeat = function(s, n) {
      if (n < 1) {
        return "";
      }
      if (n % 2) {
        return _repeat(s, n - 1) + s;
      }
      var half = _repeat(s, n >> 1);
      return half + half;
    };
    return function(s, b) {
      if (b === Infinity) {
        throw new RangeError();
      }
      return _repeat(s, b|0);
    };
  })();
  
  fn.defineBinaryProperty(String.prototype, "__mul__", function(b) {
    if (typeof b === "number") {
      return repeat(this, b);
    }
    return 0;
  });
  fn.defineBinaryProperty(String.prototype, "__div__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
        return items.join("");
      });
    }
    return 0;
  });
  fn.defineBinaryProperty(String.prototype, "__mod__", function(b) {
    if (typeof b === "number") {
      return utils.clump(this.split(""), Math.floor(b)).map(function(items) {
        return items.join("");
      });
    }
    return 0;
  });
  
  // arity operators
  Object.keys(ops.ARITY_OPS).forEach(function(selector) {
    fn.defineProperty(String.prototype, selector, fn(function() {
      var args = slice.call(arguments);
      return (0)[selector].apply(asNumber(this), args);
    }).defaults(ops.ARITY_OPS[selector]).multiCall().build());
  });

  fn.defineProperty(String.prototype, "time", function() {
    var val = timevalue(this);
    if (typeof val === "string") {
      return 0;
    }
    return val;
  });
  
  fn.defineProperty(String.prototype, "note", function() {
    var val = notevalue(this);
    if (typeof val === "string") {
      return 0;
    }
    return val;
  });
  
  module.exports = {};

});
