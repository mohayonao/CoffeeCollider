define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils = require("./utils");
  
  var setup = function(key, func) {
    [cc.Object, Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      fn.definePrototypeProperty(Klass, key, func);
    });
  };

  var setupUnaryOperator = function(selector, func, ugenSelector) {
    ugenSelector = ugenSelector || selector;
    [cc.Object, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      fn.definePrototypeProperty(Klass, selector, func);
    });
    fn.definePrototypeProperty(Array, selector, function() {
      return this.map(function(x) {
        return x[selector]();
      });
    });
    fn.definePrototypeProperty(cc.UGen, selector, function() {
      return cc.createUnaryOpUGen(ugenSelector, this);
    });
  };

  var makeBinaryOpFunction = function(func, selector) {
    return function(b) {
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return this[selector](b);
        }, this);
      }
      return func(this, b);
    };
  };
  
  var makeBinaryOpNumberFunction = function(func, selector, ugenSelector) {
    return function(b) {
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return this[selector](b);
        }, this);
      } else if (cc.instanceOfUGen(b)) {
        return cc.createBinaryOpUGen(ugenSelector, this, b);
      }
      return func(this, b);
    };
  };
  var makeBinaryOpArrayFunction = function(selector, ugenSelector) {
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
      } else if (cc.instanceOfUGen(b)) {
        return a.map(function(a) {
          return cc.createBinaryOpUGen(ugenSelector, a, b);
        });
      }
      return a.map(function(a) {
        return a[selector](b);
      });
    };
  };
  var makeBinaryOpUGenFunction = function(selector) {
    return function(b) {
      var a = this;
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return cc.createBinaryOpUGen(selector, a, b);
        });
      }
      return cc.createBinaryOpUGen(selector, a, b);
    };
  };
  
  var setupBinaryOperator = function(selector, func, ugenSelector) {
    ugenSelector = ugenSelector || selector;
    [cc.Object, Boolean, Date, Function, String].forEach(function(Klass) {
      fn.definePrototypeProperty(
        Klass, selector, makeBinaryOpFunction(func, selector)
      );
    });
    fn.definePrototypeProperty(
      Number, selector, makeBinaryOpNumberFunction(func, selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      Array, selector, makeBinaryOpArrayFunction(selector, ugenSelector)
    );
    fn.definePrototypeProperty(
      cc.UGen, selector, makeBinaryOpUGenFunction(ugenSelector)
    );
  };

  
  setupUnaryOperator("__plus__", function() {
    return +this;
  }, "+");
  setupUnaryOperator("__minus__", function() {
    return -this;
  }, "-");
  
  setupBinaryOperator("__add__", function(a, b) {
    return a + b;
  }, "+");
  
  setupBinaryOperator("__sub__", function(a, b) {
    return a - b;
  }, "-");
  
  setupBinaryOperator("__mul__", function(a, b) {
    return a * b;
  }, "*");
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
    if (Array.isArray(b)) {
      return b.map(function() {
        return NaN;
      });
    }
    return this * b;
  });

  
  setupBinaryOperator("__div__", function(a, b) {
    return a / b;
  }, "/");
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
  
  setupBinaryOperator("__mod__", function(a, b) {
    return a % b;
  }, "%");
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
  
  
  setup("to_i", function() {
    return this|0;
  });
  fn.definePrototypeProperty(Array, "to_i", function() {
    return this.map(function(x) {
      return x.to_i();
    });
  });
  
  setup("to_f", function() {
    return +this;
  });
  fn.definePrototypeProperty(Array, "to_f", function() {
    return this.map(function(x) {
      return x.to_f();
    });
  });
  
  setup("to_s", function() {
    return this.toString();
  });
  fn.definePrototypeProperty(Array, "to_s", function() {
    return this.map(function(x) {
      return x.to_s();
    });
  });
  
  setup("to_a", function() {
    return [this];
  });
  fn.definePrototypeProperty(Array, "to_a", function() {
    return this;
  });
  
  
  fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults("mul=1,add=0").multiCall().build());
  
  fn.definePrototypeProperty(Array, "madd", fn(function(mul, add) {
    return utils.flop([this, mul, add]).map(function(items) {
      var _in = items[0], mul = items[1], add = items[2];
      return cc.createMulAdd(_in, mul, add);
    });
  }).defaults("mul=1,add=0").multiCall().build());
  
  
  module.exports = {};

});
