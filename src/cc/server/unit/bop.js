define(function(require, exports, module) {
  "use strict";

  var cc  = require("../cc");
  var ops = require("../../common/ops");

  var calcFunc = {};
  
  cc.unit.specs.BinaryOpUGen = (function() {
    
    var ctor = function() {
      var func = calcFunc[ops.BINARY_OPS_MAP[this.specialIndex]];
      var process;
      if (func) {
        switch (this.inRates[0]) {
        case C.AUDIO:
          switch (this.inRates[1]) {
          case C.AUDIO:   process = func.aa; break;
          case C.CONTROL: process = func.ak; break;
          case C.SCALAR:  process = func.ai; break;
          }
          break;
        case C.CONTROL:
          switch (this.inRates[1]) {
          case C.AUDIO:   process = func.ka; break;
          case C.CONTROL: process = func.kk; break;
          case C.SCALAR:  process = func.kk; break;
          }
          break;
        case C.SCALAR:
          switch (this.inRates[1]) {
          case C.AUDIO:   process = func.ia; break;
          case C.CONTROL: process = func.kk; break;
          case C.SCALAR:  process = null   ; break;
          }
          break;
        }
        this.process = process;
        this._a = this.inputs[0][0];
        this._b = this.inputs[1][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
        }
      } else {
        var opName = ops.BINARY_OPS_MAP[this.specialIndex] || "unknown";
        throw new Error("BinaryOpUGen[" + opName + "] is not defined.");
      }
    };
    
    return ctor;
  })();
  
  var binary_aa = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], bIn[i  ]); out[i+1] = func(aIn[i+1], bIn[i+1]);
        out[i+2] = func(aIn[i+2], bIn[i+2]); out[i+3] = func(aIn[i+3], bIn[i+3]);
        out[i+4] = func(aIn[i+4], bIn[i+4]); out[i+5] = func(aIn[i+5], bIn[i+5]);
        out[i+6] = func(aIn[i+6], bIn[i+6]); out[i+7] = func(aIn[i+7], bIn[i+7]);
      }
    };
  };
  var binary_ak = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], b = this._b;
      var nextB  = this.inputs[1][0];
      var b_slope = (nextB - this._b) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], b); b += b_slope;
        out[i+1] = func(aIn[i+1], b); b += b_slope;
        out[i+2] = func(aIn[i+2], b); b += b_slope;
        out[i+3] = func(aIn[i+3], b); b += b_slope;
        out[i+4] = func(aIn[i+4], b); b += b_slope;
        out[i+5] = func(aIn[i+5], b); b += b_slope;
        out[i+6] = func(aIn[i+6], b); b += b_slope;
        out[i+7] = func(aIn[i+7], b); b += b_slope;
      }
      this._b = nextB;
    };
  };
  var binary_ai = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var aIn = this.inputs[0], b = this._b;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(aIn[i  ], b);
        out[i+1] = func(aIn[i+1], b);
        out[i+2] = func(aIn[i+2], b);
        out[i+3] = func(aIn[i+3], b);
        out[i+4] = func(aIn[i+4], b);
        out[i+5] = func(aIn[i+5], b);
        out[i+6] = func(aIn[i+6], b);
        out[i+7] = func(aIn[i+7], b);
      }
    };
  };
  var binary_ka = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this._a, bIn = this.inputs[1];
      var nextA  = this.inputs[0][0];
      var a_slope = (nextA - this._a) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a, bIn[i  ]); a += a_slope;
        out[i+1] = func(a, bIn[i+1]); a += a_slope;
        out[i+2] = func(a, bIn[i+2]); a += a_slope;
        out[i+3] = func(a, bIn[i+3]); a += a_slope;
        out[i+4] = func(a, bIn[i+4]); a += a_slope;
        out[i+5] = func(a, bIn[i+5]); a += a_slope;
        out[i+6] = func(a, bIn[i+6]); a += a_slope;
        out[i+7] = func(a, bIn[i+7]); a += a_slope;
      }
      this._a = nextA;
    };
  };
  var binary_kk = function(func) {
    return function() {
      this.outputs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
    };
  };
  var binary_ia = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this._a, bIn = this.inputs[1];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a, bIn[i  ]);
        out[i+1] = func(a, bIn[i+1]);
        out[i+2] = func(a, bIn[i+2]);
        out[i+3] = func(a, bIn[i+3]);
        out[i+4] = func(a, bIn[i+4]);
        out[i+5] = func(a, bIn[i+5]);
        out[i+6] = func(a, bIn[i+6]);
        out[i+7] = func(a, bIn[i+7]);
      }
    };
  };
  
  
  calcFunc["+"] = function(a, b) {
    return a + b;
  };
  calcFunc["+"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + bIn[i  ];
      out[i+1] = aIn[i+1] + bIn[i+1];
      out[i+2] = aIn[i+2] + bIn[i+2];
      out[i+3] = aIn[i+3] + bIn[i+3];
      out[i+4] = aIn[i+4] + bIn[i+4];
      out[i+5] = aIn[i+5] + bIn[i+5];
      out[i+6] = aIn[i+6] + bIn[i+6];
      out[i+7] = aIn[i+7] + bIn[i+7];
    }
  };
  calcFunc["+"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + b; b += b_slope;
      out[i+1] = aIn[i+1] + b; b += b_slope;
      out[i+2] = aIn[i+2] + b; b += b_slope;
      out[i+3] = aIn[i+3] + b; b += b_slope;
      out[i+4] = aIn[i+4] + b; b += b_slope;
      out[i+5] = aIn[i+5] + b; b += b_slope;
      out[i+6] = aIn[i+6] + b; b += b_slope;
      out[i+7] = aIn[i+7] + b; b += b_slope;
    }
    this._b = nextB;
  };
  calcFunc["+"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] + b;
      out[i+1] = aIn[i+1] + b;
      out[i+2] = aIn[i+2] + b;
      out[i+3] = aIn[i+3] + b;
      out[i+4] = aIn[i+4] + b;
      out[i+5] = aIn[i+5] + b;
      out[i+6] = aIn[i+6] + b;
      out[i+7] = aIn[i+7] + b;
    }
  };
  calcFunc["+"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a + bIn[i  ]; a += a_slope;
      out[i+1] = a + bIn[i+1]; a += a_slope;
      out[i+2] = a + bIn[i+2]; a += a_slope;
      out[i+3] = a + bIn[i+3]; a += a_slope;
      out[i+4] = a + bIn[i+4]; a += a_slope;
      out[i+5] = a + bIn[i+5]; a += a_slope;
      out[i+6] = a + bIn[i+6]; a += a_slope;
      out[i+7] = a + bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  calcFunc["+"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0];
  };
  calcFunc["+"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a + bIn[i  ];
      out[i+1] = a + bIn[i+1];
      out[i+2] = a + bIn[i+2];
      out[i+3] = a + bIn[i+3];
      out[i+4] = a + bIn[i+4];
      out[i+5] = a + bIn[i+5];
      out[i+6] = a + bIn[i+6];
      out[i+7] = a + bIn[i+7];
    }
  };
  
  calcFunc["-"] = function(a, b) {
    return a - b;
  };
  calcFunc["-"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - bIn[i  ];
      out[i+1] = aIn[i+1] - bIn[i+1];
      out[i+2] = aIn[i+2] - bIn[i+2];
      out[i+3] = aIn[i+3] - bIn[i+3];
      out[i+4] = aIn[i+4] - bIn[i+4];
      out[i+5] = aIn[i+5] - bIn[i+5];
      out[i+6] = aIn[i+6] - bIn[i+6];
      out[i+7] = aIn[i+7] - bIn[i+7];
    }
  };
  calcFunc["-"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - b; b += b_slope;
      out[i+1] = aIn[i+1] - b; b += b_slope;
      out[i+2] = aIn[i+2] - b; b += b_slope;
      out[i+3] = aIn[i+3] - b; b += b_slope;
      out[i+4] = aIn[i+4] - b; b += b_slope;
      out[i+5] = aIn[i+5] - b; b += b_slope;
      out[i+6] = aIn[i+6] - b; b += b_slope;
      out[i+7] = aIn[i+7] - b; b += b_slope;
    }
    this._b = nextB;
  };
  calcFunc["-"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] - b;
      out[i+1] = aIn[i+1] - b;
      out[i+2] = aIn[i+2] - b;
      out[i+3] = aIn[i+3] - b;
      out[i+4] = aIn[i+4] - b;
      out[i+5] = aIn[i+5] - b;
      out[i+6] = aIn[i+6] - b;
      out[i+7] = aIn[i+7] - b;
    }
  };
  calcFunc["-"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a - bIn[i  ]; a += a_slope;
      out[i+1] = a - bIn[i+1]; a += a_slope;
      out[i+2] = a - bIn[i+2]; a += a_slope;
      out[i+3] = a - bIn[i+3]; a += a_slope;
      out[i+4] = a - bIn[i+4]; a += a_slope;
      out[i+5] = a - bIn[i+5]; a += a_slope;
      out[i+6] = a - bIn[i+6]; a += a_slope;
      out[i+7] = a - bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  calcFunc["-"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] - this.inputs[1][0];
  };
  calcFunc["-"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a - bIn[i  ];
      out[i+1] = a - bIn[i+1];
      out[i+2] = a - bIn[i+2];
      out[i+3] = a - bIn[i+3];
      out[i+4] = a - bIn[i+4];
      out[i+5] = a - bIn[i+5];
      out[i+6] = a - bIn[i+6];
      out[i+7] = a - bIn[i+7];
    }
  };

  calcFunc["*"] = function(a, b) {
    return a * b;
  };
  calcFunc["*"].aa = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * bIn[i  ];
      out[i+1] = aIn[i+1] * bIn[i+1];
      out[i+2] = aIn[i+2] * bIn[i+2];
      out[i+3] = aIn[i+3] * bIn[i+3];
      out[i+4] = aIn[i+4] * bIn[i+4];
      out[i+5] = aIn[i+5] * bIn[i+5];
      out[i+6] = aIn[i+6] * bIn[i+6];
      out[i+7] = aIn[i+7] * bIn[i+7];
    }
  };
  calcFunc["*"].ak = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    var nextB  = this.inputs[1][0];
    var b_slope = (nextB - this._b) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * b; b += b_slope;
      out[i+1] = aIn[i+1] * b; b += b_slope;
      out[i+2] = aIn[i+2] * b; b += b_slope;
      out[i+3] = aIn[i+3] * b; b += b_slope;
      out[i+4] = aIn[i+4] * b; b += b_slope;
      out[i+5] = aIn[i+5] * b; b += b_slope;
      out[i+6] = aIn[i+6] * b; b += b_slope;
      out[i+7] = aIn[i+7] * b; b += b_slope;
    }
    this._b = nextB;
  };
  calcFunc["*"].ai = function(inNumSamples) {
    var out = this.outputs[0];
    var aIn = this.inputs[0], b = this._b;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = aIn[i  ] * b;
      out[i+1] = aIn[i+1] * b;
      out[i+2] = aIn[i+2] * b;
      out[i+3] = aIn[i+3] * b;
      out[i+4] = aIn[i+4] * b;
      out[i+5] = aIn[i+5] * b;
      out[i+6] = aIn[i+6] * b;
      out[i+7] = aIn[i+7] * b;
    }
  };
  calcFunc["*"].ka = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    var nextA  = this.inputs[0][0];
    var a_slope = (nextA - this._a) * this.rate.slopeFactor;
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a * bIn[i  ]; a += a_slope;
      out[i+1] = a * bIn[i+1]; a += a_slope;
      out[i+2] = a * bIn[i+2]; a += a_slope;
      out[i+3] = a * bIn[i+3]; a += a_slope;
      out[i+4] = a * bIn[i+4]; a += a_slope;
      out[i+5] = a * bIn[i+5]; a += a_slope;
      out[i+6] = a * bIn[i+6]; a += a_slope;
      out[i+7] = a * bIn[i+7]; a += a_slope;
    }
    this._a = nextA;
  };
  calcFunc["*"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0];
  };
  calcFunc["*"].ia = function(inNumSamples) {
    var out = this.outputs[0];
    var a = this._a, bIn = this.inputs[1];
    for (var i = 0; i < inNumSamples; i += 8) {
      out[i  ] = a * bIn[i  ];
      out[i+1] = a * bIn[i+1];
      out[i+2] = a * bIn[i+2];
      out[i+3] = a * bIn[i+3];
      out[i+4] = a * bIn[i+4];
      out[i+5] = a * bIn[i+5];
      out[i+6] = a * bIn[i+6];
      out[i+7] = a * bIn[i+7];
    }
  };

  calcFunc["/"] = function(a, b) {
    return b === 0 ? 0 : a / b;
  };
  calcFunc["%"] = function(a, b) {
    return b === 0 ? 0 : a % b;
  };

  calcFunc.eq = function(a, b) {
    return a === b ? 1 : 0;
  };
  calcFunc.ne = function(a, b) {
    return a !== b ? 1 : 0;
  };
  calcFunc.lt = function(a, b) {
    return a < b ? 1 : 0;
  };
  calcFunc.gt = function(a, b) {
    return a > b ? 1 : 0;
  };
  calcFunc.le = function(a, b) {
    return a <= b ? 1 : 0;
  };
  calcFunc.ge = function(a, b) {
    return a >= b ? 1 : 0;
  };
  calcFunc.bitAnd = function(a, b) {
    return a & b;
  };
  calcFunc.bitOr = function(a, b) {
    return a | b;
  };
  calcFunc.bitXor = function(a, b) {
    return a ^ b;
  };
  calcFunc.min = function(a, b) {
    return Math.min(a, b);
  };
  calcFunc.max = function(a, b) {
    return Math.max(a, b);
  };
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  calcFunc.lcm = function(a, b) {
    if (a === 0 && b === 0) {
      return 0;
    }
    return Math.abs(a * b) / gcd(a, b);
  };
  calcFunc.gcd = function(a, b) {
    return gcd(a, b);
  };
  calcFunc.round = function(a, b) {
    return b === 0 ? a : Math.round(a / b) * b;
  };
  calcFunc.roundUp = function(a, b) {
    return b === 0 ? a : Math.ceil(a / b) * b;
  };
  calcFunc.roundDown = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  calcFunc.trunc = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  calcFunc.atan2 = function(a, b) {
    return Math.atan2(a, b);
  };
  calcFunc.hypot = function(a, b) {
    return Math.sqrt((a * a) + (b * b));
  };
  calcFunc.hypotApx = function(a, b) {
    var x = Math.abs(a), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  };
  calcFunc.pow = function(a, b) {
    return Math.pow(Math.abs(a), b);
  };
  calcFunc.leftShift = function(a, b) {
    if (b < 0) {
      return (a|0) >> (-b|0);
    }
    return (a|0) << (b|0);
  };
  calcFunc.rightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  calcFunc.unsignedRightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  calcFunc.ring1 = function(a, b) {
    return a * b + a;
  };
  calcFunc.ring2 = function(a, b) {
    return a * b + a + b;
  };
  calcFunc.ring3 = function(a, b) {
    return a * a * b;
  };
  calcFunc.ring4 = function(a, b) {
    return a * a * b - a * b * b;
  };
  calcFunc.difsqr = function(a, b) {
    return a * a - b * b;
  };
  calcFunc.sumsqr = function(a, b) {
    return a * a + b * b;
  };
  calcFunc.sqrsum = function(a, b) {
    return (a + b) * (a + b);
  };
  calcFunc.sqrdif = function(a, b) {
    return (a - b) * (a - b);
  };
  calcFunc.absdif = function(a, b) {
    return Math.abs(a - b);
  };
  calcFunc.thresh = function(a, b) {
    return a < b ? 0 : a;
  };
  calcFunc.amclip = function(a, b) {
    return a * 0.5 * (b + Math.abs(b));
  };
  calcFunc.scaleneg = function(a, b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(a) - a) * b + a;
  };
  calcFunc.clip2 = function(a, b) {
    return Math.max(-b, Math.min(a, b));
  };
  calcFunc.excess = function(a, b) {
    return a - Math.max(-b, Math.min(a, b));
  };
  calcFunc.fold2 = function(a, b) {
    var _in = a, x, c, range, range2;
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
  };
  calcFunc.wrap2 = function(a, b) {
    var _in = a, range;
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
  };
  
  
  Object.keys(calcFunc).forEach(function(key) {
    var func = calcFunc[key];
    if (!func.aa) {
      func.aa = binary_aa(func);
    }
    if (!func.ak) {
      func.ak = binary_ak(func);
    }
    if (!func.ai) {
      func.ai = binary_ai(func);
    }
    if (!func.ka) {
      func.ka = binary_ka(func);
    }
    if (!func.kk) {
      func.kk = binary_kk(func);
    }
    if (!func.ia) {
      func.ia = binary_ia(func);
    }
    func.ki = func.kk;
    func.ik = func.kk;
  });
  
  module.exports = {
    calcFunc : calcFunc,
    binary_aa: binary_aa,
    binary_ak: binary_ak,
    binary_ai: binary_ai,
    binary_ka: binary_ka,
    binary_kk: binary_kk,
    binary_ia: binary_ia,
  };

});
