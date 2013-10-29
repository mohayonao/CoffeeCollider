define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils = require("./utils");
  
  var MulAdd;
  
  var setup = function(key, func) {
    [cc.Object, Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      fn.definePrototypeProperty(Klass, key, func);
    });
  };
  
  exports = function() {
    setup("__plus__", function() {
      return +this;
    });
    setup("__minus__", function() {
      return -this;
    });
    setup("__add__", function(b) {
      return this + b;
    });
    setup("__sub__", function(b) {
      return this - b;
    });
    setup("__mul__", function(b) {
      return this * b;
    });
    setup("__div__", function(b) {
      return this / b;
    });
    setup("__mod__", function(b) {
      return this % b;
    });
    setup("__and__", function(b) {
      return this && b;
    });
    setup("__or__", function(b) {
      return this || b;
    });
    setup("next", function() {
      return this;
    });
    setup("to_i", function() {
      return this|0;
    });
    setup("to_f", function() {
      return +this;
    });
    setup("to_s", function() {
      return this.toString();
    });
    setup("to_a", function() {
      return [this];
    });
    
    fn.definePrototypeProperty(String, "__mul__", function(b) {
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
      return this * b;
    });
    
    fn.definePrototypeProperty(Function, "__mul__", function(b) {
      if (typeof b === "function") {
        var f = this, g = b;
        return function() {
          return f.call(null, g.apply(null, arguments));
        };
      }
      return this * b;
    });
    
    fn.definePrototypeProperty(String, "__div__", function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), Math.ceil(this.length/b)).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__div__(b);
        }, this);
      }
      return this / b;
    });
    
    fn.definePrototypeProperty(String, "__mod__", function(b) {
      if (typeof b === "number") {
        return utils.clump(this.split(""), b|0).map(function(items) {
          return items.join("");
        });
      } else if (Array.isArray(b)) {
        return b.map(function(b) {
          return this.__mod__(b);
        }, this);
      }
      return this % b;
    });
    
    fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
      return new MulAdd().init(this, mul, add);
    }).defaults("mul=1,add=0").multiCall().build());
    
    fn.definePrototypeProperty(Array, "madd", fn(function(mul, add) {
      return utils.flop([this, mul, add]).map(function(items) {
        var _in = items[0], mul = items[1], add = items[2];
        return new MulAdd().init(_in, mul, add);
      });
    }).defaults("mul=1,add=0").multiCall().build());

    fn.definePrototypeProperty(Array, "to_i", function() {
      return this.map(function(x) {
        return x.to_i();
      });
    });
    fn.definePrototypeProperty(Array, "to_f", function() {
      return this.map(function(x) {
        return x.to_f();
      });
    });
    fn.definePrototypeProperty(Array, "to_s", function() {
      return this.map(function(x) {
        return x.to_s();
      });
    });
    fn.definePrototypeProperty(Array, "to_a", function() {
      return this;
    });

    setup("__and__",function(b) {
      return cc.createTaskWaitLogic("and", [this].concat(b));
    });
    fn.definePrototypeProperty(Array, "__and__", function(b) {
      return cc.createTaskWaitLogic("and", this.concat(b));
    });
    
    setup("__or__", function(b) {
      return cc.createTaskWaitLogic("or", [this].concat(b));
    });
    fn.definePrototypeProperty(Array, "__or__", function(b) {
      return cc.createTaskWaitLogic("or", this.concat(b));
    });
  };
  
  cc.once("basic_ops.js", function(payload) {
    MulAdd = payload.MulAdd;
  });
  
  module.exports = {
    exports: exports
  };

});
