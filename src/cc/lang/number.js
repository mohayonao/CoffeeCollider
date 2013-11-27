define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  var drand = function() {
    return cc.lang.random.next();
  };

  // common methods
  fn.defineProperty(Number.prototype, "copy", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  
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
  fn.defineProperty(Number.prototype, "isNil", function() {
    return 0;
  });
  fn.defineProperty(Number.prototype, "notNil", function() {
    return 1;
  });
  fn.defineProperty(Number.prototype, "bitNot", function() {
    return ~this;
  });
  fn.defineProperty(Number.prototype, "abs", function() {
    return Math.abs(this);
  });
  fn.defineProperty(Number.prototype, "asFloat", function() {
    return +this;
  });
  fn.defineProperty(Number.prototype, "asInt", function() {
    return this|0;
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
    return drand() * this;
  });
  fn.defineProperty(Number.prototype, "rand2", function() {
    return (drand() *  2 - 1) * this;
  });
  fn.defineProperty(Number.prototype, "linrand", function() {
    return Math.min(drand(), drand()) * this;
  });
  fn.defineProperty(Number.prototype, "bilinrand", function() {
    return (drand() - drand()) * this;
  });
  fn.defineProperty(Number.prototype, "sum3rand", function() {
    return (drand() + drand() + drand() - 1.5) * 0.666666667 * this;
  });
  fn.defineProperty(Number.prototype, "distort", function() {
    return this / (1 + Math.abs(this));
  });
  fn.defineProperty(Number.prototype, "softclip", function() {
    var absa = Math.abs(this);
    return absa <= 0.5 ? this : (absa - 0.25) / this;
  });
  fn.defineProperty(Number.prototype, "coin", function() {
    return drand() < this;
  });
  fn.defineProperty(Number.prototype, "digitvalue", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "silence", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "thru", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "rectWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "hanWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "welWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "triWindow", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "ramp", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "scurve", function() {
    return 0; // TODO: implements
  });
  fn.defineProperty(Number.prototype, "numunaryselectors", function() {
    return 0; // TODO: implements
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
  fn.defineProperty(Number.prototype, "half", function() {
    return this * 0.5;
  });
  fn.defineProperty(Number.prototype, "twice", function() {
    return this * 2;
  });
  
  // binary operator methods
  fn.defineBinaryProperty(Number.prototype, "__add__", function(b) {
    return this + b;
  });
  fn.defineBinaryProperty(Number.prototype, "__sub__", function(b) {
    return this - b;
  });
  fn.defineBinaryProperty(Number.prototype, "__mul__", function(b) {
    return this * b;
  });
  fn.defineBinaryProperty(Number.prototype, "__div__", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return this / b;
  });
  fn.defineBinaryProperty(Number.prototype, "__mod__", function(b) {
    if (b === 0) {
      return 0; // avoid NaN
    }
    return this % b;
  });
  fn.defineBinaryProperty(Number.prototype, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  });
  fn.defineBinaryProperty(Number.prototype, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  });
  fn.defineBinaryProperty(Number.prototype, "eq", function(b) {
    return this === b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "ne", function(b) {
    return this !== b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "lt", function(b) {
    return this < b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "gt", function(b) {
    return this > b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "le", function(b) {
    return this <= b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "ge", function(b) {
    return this >= b ? 1 : 0;
  });
  fn.defineBinaryProperty(Number.prototype, "bitAnd", function(b) {
    return this & b;
  });
  fn.defineBinaryProperty(Number.prototype, "bitOr", function(b) {
    return this | b;
  });
  fn.defineBinaryProperty(Number.prototype, "bitXor", function(b) {
    return this ^ b;
  });
  fn.defineBinaryProperty(Number.prototype, "min", function(b) {
    return Math.min(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "max", function(b) {
    return Math.max(this, b);
  });
  
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  fn.defineBinaryProperty(Number.prototype, "lcm", function(b) {
    if (this === 0 && b === 0) {
      return 0; // avoid NaN
    }
    return Math.abs(this * b) / gcd(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "gcd", function(b) {
    return gcd(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "round", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.round(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "roundUp", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.ceil(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "roundDown", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "trunc", function(b) {
    if (b === 0) {
      return this; // avoid NaN
    }
    return Math.floor(this / b) * b;
  });
  fn.defineBinaryProperty(Number.prototype, "atan2", function(b) {
    return Math.atan2(this, b);
  });
  fn.defineBinaryProperty(Number.prototype, "hypot", function(b) {
    return Math.sqrt((this * this) + (b * b));
  });
  fn.defineBinaryProperty(Number.prototype, "hypotApx", function(b) {
    var x = Math.abs(this), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  });
  fn.defineBinaryProperty(Number.prototype, "pow", function(b) {
    return Math.pow(Math.abs(this), b);
  });
  fn.defineBinaryProperty(Number.prototype, "leftShift", function(b) {
    if (b < 0) {
      return (this|0) >> (-b|0);
    }
    return (this|0) << (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "rightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "unsignedRightShift", function(b) {
    if (b < 0) {
      return (this|0) << (-b|0);
    }
    return (this|0) >> (b|0);
  });
  fn.defineBinaryProperty(Number.prototype, "fill", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "ring1", function(b) {
    return this * b + this;
  });
  fn.defineBinaryProperty(Number.prototype, "ring2", function(b) {
    return this * b + this + b;
  });
  fn.defineBinaryProperty(Number.prototype, "ring3", function(b) {
    return this * this * b;
  });
  fn.defineBinaryProperty(Number.prototype, "ring4", function(b) {
    return this * this * b - this * b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "difsqr", function(b) {
    return this * this - b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "sumsqr", function(b) {
    return this * this + b * b;
  });
  fn.defineBinaryProperty(Number.prototype, "sqrsum", function(b) {
    return (this + b) * (this + b);
  });
  fn.defineBinaryProperty(Number.prototype, "sqrdif", function(b) {
    return (this - b) * (this - b);
  });
  fn.defineBinaryProperty(Number.prototype, "absdif", function(b) {
    return Math.abs(this - b);
  });
  fn.defineBinaryProperty(Number.prototype, "thresh", function(b) {
    return this < b ? 0 : this;
  });
  fn.defineBinaryProperty(Number.prototype, "amclip", function(b) {
    return this * 0.5 * (b + Math.abs(b));
  });
  fn.defineBinaryProperty(Number.prototype, "scaleneg", function(b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(this) - this) * b + this;
  });
  fn.defineBinaryProperty(Number.prototype, "clip2", function(b) {
    return Math.max(-b, Math.min(this, b));
  });
  fn.defineBinaryProperty(Number.prototype, "excess", function(b) {
    return this - Math.max(-b, Math.min(this, b));
  });
  fn.defineBinaryProperty(Number.prototype, "fold2", function(b) {
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
  fn.defineBinaryProperty(Number.prototype, "wrap2", function(b) {
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
  fn.defineBinaryProperty(Number.prototype, "firstarg", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "randrange", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "exprandrange", function() {
    return 0; // TODO: implements
  });
  fn.defineBinaryProperty(Number.prototype, "numbinaryselectors", function() {
    return 0; // TODO: implements
  });
  
  // arity operator methods
  fn.defineProperty(Number.prototype, "madd", fn(function(mul, add) {
    return cc.createMulAdd(this, mul, add);
  }).defaults(ops.ARITY_OPS.madd).build());
  
  fn.defineArityProperty(Number.prototype, "range", fn(function(lo, hi) {
    return this.linlin(0, 1, lo, hi);
  }).defaults(ops.ARITY_OPS.range).build());
  
  fn.defineArityProperty(Number.prototype, "exprange", fn(function(lo, hi) {
    return this.linexp(0, 1, lo, hi);
  }).defaults(ops.ARITY_OPS.exprange).build());
  
  fn.defineArityProperty(Number.prototype, "curverange", fn(function(lo, hi, curve) {
    return this.lincurve(0, 1, lo, hi, curve);
  }).defaults(ops.ARITY_OPS.curverange).build());
  
  fn.defineArityProperty(Number.prototype, "unipolar", fn(function(mul) {
    return this.__mul__(mul);
  }).defaults(ops.ARITY_OPS.unipolar).build());
  
  fn.defineArityProperty(Number.prototype, "bipolar", fn(function(mul) {
    return (this * 2 - 1).__mul__(mul);
  }).defaults(ops.ARITY_OPS.bipolar).build());
  
  fn.defineArityProperty(Number.prototype, "clip", fn(function(lo, hi) {
    return Math.max(lo, Math.min(this, hi));
  }).defaults(ops.ARITY_OPS.clip).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "fold", fn(function(lo, hi) {
    var _in = this, x, c, range, range2;
    x = _in - lo;
    if (_in >= hi) {
      _in = hi + hi - _in;
      if (_in >= lo) {
        return _in;
      }
    } else if (_in < lo) {
      _in = lo + lo - _in;
      if (_in < hi) {
        return _in;
      }
    } else {
      return _in;
    }
    
    if (hi === lo) {
      return lo;
    }
    range = hi - lo;
    range2 = range + range;
    c = x - range2 * Math.floor(x / range2);
    if (c >= range) {
      c = range2 - c;
    }
    return c + lo;
  }).defaults(ops.ARITY_OPS.fold).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "wrap", fn(function(lo, hi) {
    if (lo > hi) {
      return this.wrap(hi, lo);
    }
    var _in = this, range;
    if (_in >= hi) {
      range = hi - lo;
      _in -= range;
      if (_in < hi) {
        return _in;
      }
    } else if (_in < lo) {
      range = hi - lo;
      _in += range;
      if (_in >= lo) {
        return _in;
      }
    } else {
      return _in;
    }
    
    if (hi === lo) {
      return lo;
    }
    return _in - range * Math.floor((_in - lo) / range);
  }).defaults(ops.ARITY_OPS.wrap).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "blend", fn(function(that, blendFrac) {
    return this + blendFrac * (that - this);
  }).defaults(ops.ARITY_OPS.wrap).multiCall().build());
  
  fn.defineProperty(Number.prototype, "lag", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag2", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag3", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lagud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag2ud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "lag3ud", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "varlag", function() {
    return this;
  });
  
  fn.defineProperty(Number.prototype, "slew", function() {
    return this;
  });
  
  fn.defineArityProperty(Number.prototype, "linlin", fn(function(inMin, inMax, outMin, outMax, clip) {
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
    // (this-inMin)/(inMax-inMin) * (outMax-outMin) + outMin;
    return (this.__sub__(inMin)).__div__(inMax.__sub__(inMin)).__mul__(outMax.__sub__(outMin)).__add__(outMin);
  }).defaults(ops.ARITY_OPS.linlin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "linexp", fn(function(inMin, inMax, outMin, outMax, clip) {
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
    // Math.pow(outMax/outMin, (this-inMin)/(inMax-inMin)) * outMin;
    return outMax.__div__(outMin).pow((this.__sub__(inMin)).__div__(inMax.__sub__(inMin))).__mul__(outMin);
  }).defaults(ops.ARITY_OPS.linexp).multiCall().build());

  fn.defineArityProperty(Number.prototype, "explin", fn(function(inMin, inMax, outMin, outMax, clip) {
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
    // (((Math.log(this/inMin)) / (Math.log(inMax/inMin))) * (outMax-outMin)) + outMin;
    return (this.__div__(inMin).log().__div__(inMax.__div__(inMin).log()).__mul__(outMax.__sub__(outMin))).__add__(outMin);
  }).defaults(ops.ARITY_OPS.explin).multiCall().build());

  fn.defineArityProperty(Number.prototype, "expexp", fn(function(inMin, inMax, outMin, outMax, clip) {
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
    // Math.pow(outMax/outMin, Math.log(this/inMin) / Math.log(inMax/inMin)) * outMin;
    return outMax.__div__(outMin).pow(this.__div__(inMin).log().__div__(inMax.__div__(inMin).log())).__mul__(outMin);
  }).defaults(ops.ARITY_OPS.expexp).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "lincurve", fn(function(inMin, inMax, outMin, outMax, curve, clip) {
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
    if (Math.abs(curve) < 0.001) {
      return this.linlin(inMin, inMax, outMin, outMax, clip);
    }
    var grow = curve.exp();
    var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
    var b = outMin.__add__(a);
    var scaled = (this.__sub__(inMin)).__div__(inMax.__sub__(inMin));
    return b.__sub__(a.__mul__(grow.pow(scaled)));
  }).defaults(ops.ARITY_OPS.lincurve).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "curvelin", fn(function(inMin, inMax, outMin, outMax, curve, clip) {
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
    if (Math.abs(curve) < 0.001) {
      return this.linlin(inMin, inMax, outMin, outMax, clip);
    }
    var grow = curve.exp();
    var a = outMax.__sub__(outMin).__div__((1).__sub__(grow));
    var b = outMin.__add__(a);
    var scaled = (this.__sub__(inMin)).__div__(inMax.__sub__(inMin));
    return ((b.__sub__(scaled)).__div__(a)).log().__div__(curve);
  }).defaults(ops.ARITY_OPS.curvelin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "bilin", fn(function(inCenter, inMin, inMax, outCenter, outMin, outMax, clip) {
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
    if (this >= inCenter) {
      return this.linlin(inCenter, inMax, outCenter, outMax);
    } else {
      return this.linlin(inMin, inCenter, outMin, outCenter);
    }
  }).defaults(ops.ARITY_OPS.bilin).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "rrand", fn(function(num) {
    var a = this, b = num;
    return a + drand() * (b - a);
  }).defaults(ops.ARITY_OPS.rrand).multiCall().build());
  
  fn.defineArityProperty(Number.prototype, "exprand", fn(function(num) {
    var a = this, b = num;
    if (a === 0) {
      return 0;
    }
    return a * Math.exp(Math.log(b / a) * drand());
  }).defaults(ops.ARITY_OPS.exprand).multiCall().build());
  
  module.exports = {};

});
