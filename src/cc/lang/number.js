define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  // unary operator methods
  fn.defineProperty(Number.prototype, "__plus__", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "__minus__", function() {
    return -this;
  });
  fn.defineProperty(Number.prototype, "neg", function() {
    return -this;
  });
  fn.defineProperty(Number.prototype, "not", function() {
    return this === 0 ? 1 : 0;
  });
  fn.defineProperty(Number.prototype, "abs", function() {
    return Math.abs(this);
  });
  fn.defineProperty(Number.prototype, "ceil", function() {
    return Math.ceil(this);
  });
  fn.defineProperty(Number.prototype, "floor", function() {
    return Math.floor(this);
  });
  fn.defineProperty(Number.prototype, "frac", function() {
    if (this < 0) {
      return 1 + (this - (this|0));
    }
    return this - (this|0);
  });
  fn.defineProperty(Number.prototype, "sign", function() {
    if (this === 0) {
      return 0;
    } else if (this > 0) {
      return 1;
    }
    return -1;
  });
  fn.defineProperty(Number.prototype, "squared", function() {
    return this * this;
  });
  fn.defineProperty(Number.prototype, "cubed", function() {
    return this * this * this;
  });
  fn.defineProperty(Number.prototype, "sqrt", function() {
    return Math.sqrt(Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "exp", function() {
    return Math.exp(this);
  });
  fn.defineProperty(Number.prototype, "reciprocal", function() {
    return 1 / this;
  });
  fn.defineProperty(Number.prototype, "midicps", function() {
    return 440 * Math.pow(2, (this - 69) * 1/12);
  });
  fn.defineProperty(Number.prototype, "cpsmidi", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E * 12 + 69;
  });
  fn.defineProperty(Number.prototype, "midiratio", function() {
    return Math.pow(2, this * 1/12);
  });
  fn.defineProperty(Number.prototype, "ratiomidi", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E * 12;
  });
  fn.defineProperty(Number.prototype, "dbamp", function() {
    return Math.pow(10, this * 0.05);
  });
  fn.defineProperty(Number.prototype, "ampdb", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E * 20;
  });
  fn.defineProperty(Number.prototype, "octcps", function() {
    return 440 * Math.pow(2, this - 4.75);
  });
  fn.defineProperty(Number.prototype, "cpsoct", function() {
    return Math.log(Math.abs(this) * 1/440) * Math.LOG2E + 4.75;
  });
  fn.defineProperty(Number.prototype, "log", function() {
    return Math.log(Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "log2", function() {
    return Math.log(Math.abs(this)) * Math.LOG2E;
  });
  fn.defineProperty(Number.prototype, "log10", function() {
    return Math.log(Math.abs(this)) * Math.LOG10E;
  });
  fn.defineProperty(Number.prototype, "sin", function() {
    return Math.sin(this);
  });
  fn.defineProperty(Number.prototype, "cos", function() {
    return Math.cos(this);
  });
  fn.defineProperty(Number.prototype, "tan", function() {
    return Math.tan(this);
  });
  fn.defineProperty(Number.prototype, "asin", function() {
    return Math.asin(Math.max(-1, Math.min(this, 1)));
  });
  fn.defineProperty(Number.prototype, "acos", function() {
    return Math.acos(Math.max(-1, Math.min(this, 1)));
  });
  fn.defineProperty(Number.prototype, "atan", function() {
    return Math.atan(this);
  });
  fn.defineProperty(Number.prototype, "sinh", function() {
    return (Math.pow(Math.E, this) - Math.pow(Math.E, -this)) * 0.5;
  });
  fn.defineProperty(Number.prototype, "cosh", function() {
    return (Math.pow(Math.E, this) + Math.pow(Math.E, -this)) * 0.5;
  });
  fn.defineProperty(Number.prototype, "tanh", function() {
    return this.sinh() / this.cosh();
  });
  fn.defineProperty(Number.prototype, "rand", function() {
    return Math.random() * this;
  });
  fn.defineProperty(Number.prototype, "rand2", function() {
    return (Math.random() * 2 - 1) * this;
  });
  fn.defineProperty(Number.prototype, "linrand", function() {
    return Math.min(Math.random(), Math.random()) * this;
  });
  fn.defineProperty(Number.prototype, "bilinrand", function() {
    return (Math.random() - Math.random()) * this;
  });
  fn.defineProperty(Number.prototype, "sum3rand", function() {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * this;
  });
  fn.defineProperty(Number.prototype, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.defineProperty(Number.prototype, "coin", function() {
    return Math.random() < this;
  });
  fn.defineProperty(Number.prototype, "num", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "tilde", function() {
    return ~this;
  });
  fn.defineProperty(Number.prototype, "pi", function() {
    return this * Math.PI;
  });
  fn.defineProperty(Number.prototype, "to_i", function() {
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

  fn.defineProperty(Number.prototype, "rrand", fn(function(num) {
    var a = this, b = num;
    return a > b ?
      Math.random() * (b - a) + a :
      Math.random() * (a - b) + b;
  }).defaults("num=0").multiCall().build());

  fn.defineProperty(Number.prototype, "exprand", fn(function(num) {
    var a = this, b = num;
    if (a === 0 && b === 0) {
      return 0;
    }
    return a > b ?
      b * Math.exp(Math.log(a / b) * Math.random()) :
      a * Math.exp(Math.log(b / a) * Math.random());
  }).defaults("num=0").multiCall().build());
  
  // others
  fn.defineProperty(Number.prototype, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults("mul=1,add=0").multiCall().build());

  fn.defineProperty(Number.prototype, "linlin", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) {
        return outMin;
      }
      break;
    case "max":
      if (this >= inMax) {
        return outMax;
      }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) {
        return outMin;
      }
      if (this >= inMax) {
        return outMax;
      }
      break;
    }
    return (this-inMin)/(inMax-inMin) * (outMax-outMin) + outMin;
  }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build());

  fn.defineProperty(Number.prototype, "linexp", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    return Math.pow(outMax/outMin, (this-inMin)/(inMax-inMin)) * outMin;
  }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build());

  fn.defineProperty(Number.prototype, "explin", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    return (Math.log(this/inMin)) / (Math.log(inMax/inMin)) * (outMax-outMin) + outMin;
  }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build());

  fn.defineProperty(Number.prototype, "expexp", fn(function(inMin, inMax, outMin, outMax, clip) {
    switch (clip) {
    case "min":
      if (this <= inMin) { return outMin; }
      break;
    case "max":
      if (this >= inMax) { return outMax; }
      break;
    case "minmax":
      /* falls through */
    default:
      if (this <= inMin) { return outMin; }
      if (this >= inMax) { return outMax; }
      break;
    }
    return Math.pow(outMax/outMin, Math.log(this/inMin) / Math.log(inMax/inMin)) * outMin;
  }).defaults("inMin=0,inMax=1,outMin=1,outMax=2,clip=\"minmax\"").multiCall().build());
  
  var COMMON_FUNCTIONS = ops.COMMON_FUNCTIONS;
  Object.keys(COMMON_FUNCTIONS).forEach(function(selector) {
    if (Number.prototype[selector]) {
      return;
    }
    fn.defineProperty(Number.prototype, selector, function() {
      return this;
    });
  });
  
  module.exports = {};

});
