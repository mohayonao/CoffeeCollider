define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  // unary operator methods
  fn.definePrototypeProperty(Number, "__plus__", function() {
    return +this;
  });
  fn.definePrototypeProperty(Number, "__minus__", function() {
    return -this;
  });
  fn.definePrototypeProperty(Number, "neg", function() {
    return -this;
  });
  fn.definePrototypeProperty(Number, "not", function() {
    return this === 0 ? 1 : 0;
  });
  fn.definePrototypeProperty(Number, "abs", function() {
    return Math.abs(this);
  });
  fn.definePrototypeProperty(Number, "ceil", function() {
    return Math.ceil(this);
  });
  fn.definePrototypeProperty(Number, "floor", function() {
    return Math.floor(this);
  });
  fn.definePrototypeProperty(Number, "frac", function() {
    if (this < 0) {
      return 1 + (this - (this|0));
    }
    return this - (this|0);
  });
  fn.definePrototypeProperty(Number, "sign", function() {
    if (this === 0) {
      return 0;
    } else if (this > 0) {
      return 1;
    }
    return -1;
  });
  fn.definePrototypeProperty(Number, "squared", function() {
    return this * this;
  });
  fn.definePrototypeProperty(Number, "cubed", function() {
    return this * this * this;
  });
  fn.definePrototypeProperty(Number, "sqrt", function() {
    return Math.sqrt(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "exp", function() {
    return Math.exp(this);
  });
  fn.definePrototypeProperty(Number, "reciprocal", function() {
    return 1 / this;
  });
  fn.definePrototypeProperty(Number, "midicps", function() {
    return 440 * Math.pow(2, (this - 69) * 1/12);
  });
  fn.definePrototypeProperty(Number, "cpsmidi", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
  });
  fn.definePrototypeProperty(Number, "midiratio", function() {
    return Math.pow(2, this * 1/12);
  });
  fn.definePrototypeProperty(Number, "ratiomidi", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E * 12;
  });
  fn.definePrototypeProperty(Number, "dbamp", function() {
    return Math.pow(10, this * 0.05);
  });
  fn.definePrototypeProperty(Number, "ampdb", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E * 20;
  });
  fn.definePrototypeProperty(Number, "octcps", function() {
    return 440 * Math.pow(2, this - 4.75);
  });
  fn.definePrototypeProperty(Number, "cpsoct", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
  });
  fn.definePrototypeProperty(Number, "log", function() {
    return Math.log(Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "log2", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E;
  });
  fn.definePrototypeProperty(Number, "log10", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E;
  });
  fn.definePrototypeProperty(Number, "sin", function() {
    return Math.sin(this);
  });
  fn.definePrototypeProperty(Number, "cos", function() {
    return Math.cos(this);
  });
  fn.definePrototypeProperty(Number, "tan", function() {
    return Math.tan(this);
  });
  fn.definePrototypeProperty(Number, "asin", function() {
    return Math.asin(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "acos", function() {
    return Math.acos(Math.max(-1, Math.min(this, 1)));
  });
  fn.definePrototypeProperty(Number, "atan", function() {
    return Math.atan(this);
  });
  fn.definePrototypeProperty(Number, "sinh", function() {
    return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "cosh", function() {
    return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
  });
  fn.definePrototypeProperty(Number, "tanh", function() {
    return this.sinh() / this.cosh();
  });
  fn.definePrototypeProperty(Number, "rand", function() {
    return Math.random() * this;
  });
  fn.definePrototypeProperty(Number, "rand2", function() {
    return (Math.random() * 2 - 1) * this;
  });
  fn.definePrototypeProperty(Number, "linrand", function() {
    return Math.min(Math.random(), Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "bilinrand", function() {
    return (Math.random() - Math.random()) * this;
  });
  fn.definePrototypeProperty(Number, "sum3rand", function() {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * this;
  });
  fn.definePrototypeProperty(Number, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.definePrototypeProperty(Number, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.definePrototypeProperty(Number, "coin", function() {
    return Math.random() < this;
  });
  fn.definePrototypeProperty(Number, "num", function() {
    return +this;
  });
  fn.definePrototypeProperty(Number, "tilde", function() {
    return ~this;
  });
  fn.definePrototypeProperty(Number, "pi", function() {
    return this * Math.PI;
  });
  fn.definePrototypeProperty(Number, "to_i", function() {
    return this|0;
  });
  
  // binary operator methods
  fn.setupBinaryOp(Number, "__add__", function(b) {
    return this + b;
  });
  fn.setupBinaryOp(Number, "__sub__", function(b) {
    return this - b;
  });
  fn.setupBinaryOp(Number, "__mul__", function(b) {
    return this * b;
  });
  fn.setupBinaryOp(Number, "__div__", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return this / b;
  });
  fn.setupBinaryOp(Number, "__mod__", function(b) {
    if (b === 0) {
      return 0; // avoid NaN
    }
    return this % b;
  });
  fn.setupBinaryOp(Number, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.setupBinaryOp(Number, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  fn.setupBinaryOp(Number, "eq", function(b) {
    return this === b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "ne", function(b) {
    return this !== b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "lt", function(b) {
    return this < b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "gt", function(b) {
    return this > b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "le", function(b) {
    return this <= b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "ge", function(b) {
    return this >= b ? 1 : 0;
  });
  fn.setupBinaryOp(Number, "bitAnd", function(b) {
    return this & b;
  });
  fn.setupBinaryOp(Number, "bitOr", function(b) {
    return this | b;
  });
  fn.setupBinaryOp(Number, "bitXor", function(b) {
    return this ^ b;
  });
  fn.setupBinaryOp(Number, "min", function(b) {
    return Math.min(this, b);
  });
  fn.setupBinaryOp(Number, "max", function(b) {
    return Math.max(this, b);
  });
  
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  fn.setupBinaryOp(Number, "lcm", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return Math.abs(this * b) / gcd(this, b);
  });
  fn.setupBinaryOp(Number, "gcd", function(b) {
    return gcd(this, b);
  });
  fn.setupBinaryOp(Number, "round", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.round(this / b) * b;
  });
  fn.setupBinaryOp(Number, "roundUp", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.ceil(this / b) * b;
  });
  fn.setupBinaryOp(Number, "roundDown", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.setupBinaryOp(Number, "trunc", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.setupBinaryOp(Number, "atan2", function(b) {
    return Math.atan2(this, b);
  });
  fn.setupBinaryOp(Number, "hypot", function(b) {
    return Math.sqrt((this * this) + (b * b));
  });
  fn.setupBinaryOp(Number, "hypotApx", function(b) {
    var x = Math.abs(this), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  });
  fn.setupBinaryOp(Number, "pow", function(b) {
    return Math.pow(Math.abs(this), b);
  });
  fn.setupBinaryOp(Number, "leftShift", function(b) {
    if (b < 0) {
      return (this|0) >> (-b|0);
    }
    return (this|0) << (b|0);
  });
  fn.setupBinaryOp(Number, "rightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.setupBinaryOp(Number, "unsignedRightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.setupBinaryOp(Number, "ring1", function(b) {
    return this * b + this;
  });
  fn.setupBinaryOp(Number, "ring2", function(b) {
    return this * b + this + b;
  });
  fn.setupBinaryOp(Number, "ring3", function(b) {
    return this * this * b;
  });
  fn.setupBinaryOp(Number, "ring4", function(b) {
    return this * this * b - this * b * b;
  });
  fn.setupBinaryOp(Number, "difsqr", function(b) {
    return this * this - b * b;
  });
  fn.setupBinaryOp(Number, "sumsqr", function(b) {
    return this * this + b * b;
  });
  fn.setupBinaryOp(Number, "sqrsum", function(b) {
    return (this + b) * (this + b);
  });
  fn.setupBinaryOp(Number, "sqrdif", function(b) {
    return (this - b) * (this - b);
  });
  fn.setupBinaryOp(Number, "absdif", function(b) {
    return Math.abs(this - b);
  });
  fn.setupBinaryOp(Number, "thresh", function(b) {
    return this < b ? 0 : this;
  });
  fn.setupBinaryOp(Number, "amclip", function(b) {
    return this * 0.5 * (b + Math.abs(b));
  });
  fn.setupBinaryOp(Number, "scaleneg", function(b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(this) - this) * b + this;
  });
  fn.setupBinaryOp(Number, "clip2", function(b) {
    return Math.max(-b, Math.min(this, b));
  });
  fn.setupBinaryOp(Number, "excess", function(b) {
    return this - Math.max(-b, Math.min(this, b));
  });
  fn.setupBinaryOp(Number, "fold2", function(b) {
    var _in = this, x, c, range, range2;
    x = _in + b;
    if (_in >= b) {
      _in = b + b - _in;
      if (_in >= -b) {
        return _in;
      }
    } else if (_in < -b) {
      _in = -b - b - _in;
      if (_in < b) {
        return _in;
      }
    } else {
      return _in;
    }
    if (b === -b) {
      return -b;
    }
    range  = b + b;
    range2 = range + range;
    c = x - range2 * Math.floor(x / range2);
    if (c >= range) {
      c = range2 - c;
    }
    return c - b;
  });
  fn.setupBinaryOp(Number, "wrap2", function(b) {
    var _in = this, range;
    if (_in >= b) {
      range = b + b;
      _in -= range;
      if (_in < b) {
        return _in;
      }
    } else if (_in < -b) {
      range = b + b;
      _in += range;
      if (_in >= -b) {
        return _in;
      }
    } else {
      return _in;
    }
    if (b === -b) {
      return -b;
    }
    return _in - range * Math.floor((_in + b) / range);
  });
  
  // others
  fn.definePrototypeProperty(Number, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults("mul=1,add=0").multiCall().build());

  var COMMON_FUNCTIONS = ops.COMMON_FUNCTIONS;
  Object.keys(COMMON_FUNCTIONS).forEach(function(selector) {
    if (Number.prototype[selector]) {
      return;
    }
    fn.definePrototypeProperty(Number, selector, function() {
      return this;
    });
  });
  
  module.exports = {};

});
