define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var ops = require("../common/ops");
  var log001 = Math.log(0.001);
  
  var avoidzero = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = -1e-6;
      }
    } else if (a < +1e-6) {
      a = 1e-6;
    }
    return a;
  };

  var calcDemandInput = function(unit, index, offset) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit) {
      switch (fromUnit.calcRate) {
      case C.AUDIO:
        return unit.inputs[index][offset-1];
      case C.DEMAND:
        fromUnit.process(offset);
        /* fall through */
      default:
        return unit.inputs[index][0];
      }
    } else {
      return unit.inputs[index][0];
    }
  };
  
  var resetDemandInput = function(unit, index) {
    var fromUnit = unit.fromUnits[index];
    if (fromUnit && fromUnit.calcRate === C.DEMAND) {
      fromUnit.process(0);
    }
  };
  
  var uopFunc = {};
  
  cc.unit.specs.UnaryOpUGen = (function() {
    var ctor = function() {
      var func = uopFunc[ops.UNARY_OPS_MAP[this.specialIndex]];
      var process;
      if (func) {
        if (this.calcRate === C.DEMAND) {
          this.process = func.d;
        } else {
          switch (this.inRates[0]) {
          case C.AUDIO  : process = func.a; break;
          case C.CONTROL: process = func.k; break;
          }
          this.process = process;
          if (this.process) {
            this.process(1);
          } else {
            this.outputs[0][0] = func(this.inputs[0][0]);
          }
        }
      } else {
        var opName = ops.UNARY_OPS_MAP[this.specialIndex] || "unknown";
        throw new Error("UnaryOpUGen[" + opName + "] is not defined.");
      }
    };
    
    return ctor;
  })();
  
  var unary_k = function(func) {
    return function() {
      this.outputs[0][0] = func(this.inputs[0][0]);
    };
  };
  var unary_a = function(func) {
    return function(inNumSamples) {
      var out = this.outputs[0];
      var a = this.inputs[0];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = func(a[i  ]); out[i+1] = func(a[i+1]);
        out[i+2] = func(a[i+2]); out[i+3] = func(a[i+3]);
        out[i+4] = func(a[i+4]); out[i+5] = func(a[i+5]);
        out[i+6] = func(a[i+6]); out[i+7] = func(a[i+7]);
      }
    };
  };
  var unary_d = function(func) {
    return function(inNumSamples) {
      if (inNumSamples) {
        var x = calcDemandInput(this, 0, inNumSamples);
        this.outputs[0][0] = isNaN(x) ? NaN : func(x);
      } else {
        resetDemandInput(this, 0);
      }
    };
  };
  
  uopFunc.neg = function(a) {
    return -a;
  };
  uopFunc.not = function(a) {
    return a === 0 ? 1 : 0;
  };
  uopFunc.abs = function(a) {
    return Math.abs(a);
  };
  uopFunc.ceil = function(a) {
    return Math.ceil(a);
  };
  uopFunc.floor = function(a) {
    return Math.floor(a);
  };
  uopFunc.frac = function(a) {
    if (a < 0) {
      return 1 + (a - (a|0));
    }
    return a - (a|0);
  };
  uopFunc.sign = function(a) {
    if (a === 0) {
      return 0;
    } else if (a > 0) {
      return 1;
    }
    return -1;
  };
  uopFunc.squared = function(a) {
    return a * a;
  };
  uopFunc.cubed = function(a) {
    return a * a * a;
  };
  uopFunc.sqrt = function(a) {
    return Math.sqrt(Math.abs(a));
  };
  uopFunc.exp = function(a) {
    return Math.exp(a);
  };
  uopFunc.reciprocal = function(a) {
    return 1 / avoidzero(a);
  };
  uopFunc.midicps = function(a) {
    return 440 * Math.pow(2, (a - 69) * 1/12);
  };
  uopFunc.cpsmidi = function(a) {
    return Math.log(Math.abs(avoidzero(a)) * 1/440) * Math.LOG2E * 12 + 69;
  };
  uopFunc.midiratio = function(a) {
    return Math.pow(2, a * 1/12);
  };
  uopFunc.ratiomidi = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E * 12;
  };
  uopFunc.dbamp = function(a) {
    return Math.pow(10, a * 0.05);
  };
  uopFunc.ampdb = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E * 20;
  };
  uopFunc.octcps = function(a) {
    return 440 * Math.pow(2, avoidzero(a) - 4.75);
  };
  uopFunc.cpsoct = function(a) {
    return Math.log(Math.abs(a) * 1/440) * Math.LOG2E + 4.75;
  };
  uopFunc.log = function(a) {
    return Math.log(Math.abs(avoidzero(a)));
  };
  uopFunc.log2 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG2E;
  };
  uopFunc.log10 = function(a) {
    return Math.log(Math.abs(avoidzero(a))) * Math.LOG10E;
  };
  uopFunc.sin = function(a) {
    return Math.sin(a);
  };
  uopFunc.cos = function(a) {
    return Math.cos(a);
  };
  uopFunc.tan = function(a) {
    return Math.tan(a);
  };
  uopFunc.asin = function(a) {
    return Math.asin(Math.max(-1, Math.min(a, 1)));
  };
  uopFunc.acos = function(a) {
    return Math.acos(Math.max(-1, Math.min(a, 1)));
  };
  uopFunc.atan = function(a) {
    return Math.atan(a);
  };
  uopFunc.sinh = function(a) {
    return (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
  };
  uopFunc.cosh = function(a) {
    return (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
  };
  uopFunc.tanh = function(a) {
    var sinh = (Math.pow(Math.E, a) - Math.pow(Math.E, -a)) * 0.5;
    var cosh = (Math.pow(Math.E, a) + Math.pow(Math.E, -a)) * 0.5;
    return sinh / cosh;
  };
  uopFunc.rand = function(a) {
    return Math.random() * a;
  };
  uopFunc.rand2 = function(a) {
    return (Math.random() * 2 - 1) * a;
  };
  uopFunc.linrand = function(a) {
    return Math.min(Math.random(), Math.random()) * a;
  };
  uopFunc.bilinrand = function(a) {
    return (Math.random() - Math.random()) * a;
  };
  uopFunc.sum3rand = function(a) {
    return (Math.random() + Math.random() + Math.random() - 1.5) * 0.666666667 * a;
  };
  uopFunc.distort = function(a) {
    return a / (1 + Math.abs(a));
  };
  uopFunc.softclip = function(a) {
    var absa = Math.abs(a);
    return absa <= 0.5 ? a : (absa - 0.25) / a;
  };
  uopFunc.coin = function(a) {
    return Math.random() < a ? 1 : 0;
  };
  uopFunc.num = function(a) {
    return +a;
  };
  uopFunc.tilde = function(a) {
    return ~a;
  };
  uopFunc.pi = function(a) {
    return Math.PI * a;
  };
  uopFunc.to_i = function(a) {
    return a|0;
  };
  uopFunc.half = function(a) {
    return a * 0.5;
  };
  uopFunc.twice = function(a) {
    return a * 2;
  };
  
  Object.keys(uopFunc).forEach(function(key) {
    var func = uopFunc[key];
    func.a = unary_a(func);
    func.k = unary_k(func);
    func.d = unary_d(func);
  });
  
  var bopFunc = {};
  
  cc.unit.specs.BinaryOpUGen = (function() {
    var ctor = function() {
      var func = bopFunc[ops.BINARY_OPS_MAP[this.specialIndex]];
      var process;
      if (func) {
        if (this.calcRate === C.DEMAND) {
          this.process = func.dd;
        } else {
          switch (this.inRates[0]) {
          case C.AUDIO:
            switch (this.inRates[1]) {
            case C.AUDIO  : process = func.aa; break;
            case C.CONTROL: process = func.ak; break;
            case C.SCALAR : process = func.ai; break;
            }
            break;
          case C.CONTROL:
            switch (this.inRates[1]) {
            case C.AUDIO  : process = func.ka; break;
            case C.CONTROL: process = func.kk; break;
            case C.SCALAR : process = func.kk; break;
            }
            break;
          case C.SCALAR:
            switch (this.inRates[1]) {
            case C.AUDIO  : process = func.ia; break;
            case C.CONTROL: process = func.kk; break;
            case C.SCALAR : process = null   ; break;
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
  var binary_dd = function(func) {
    return function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) ? NaN : func(a, b);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
      }
    };
  };
  
  bopFunc["+"] = function(a, b) {
    return a + b;
  };
  bopFunc["+"].aa = function(inNumSamples) {
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
  bopFunc["+"].ak = function(inNumSamples) {
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
  bopFunc["+"].ai = function(inNumSamples) {
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
  bopFunc["+"].ka = function(inNumSamples) {
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
  bopFunc["+"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0];
  };
  bopFunc["+"].ia = function(inNumSamples) {
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
  
  bopFunc["-"] = function(a, b) {
    return a - b;
  };
  bopFunc["-"].aa = function(inNumSamples) {
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
  bopFunc["-"].ak = function(inNumSamples) {
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
  bopFunc["-"].ai = function(inNumSamples) {
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
  bopFunc["-"].ka = function(inNumSamples) {
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
  bopFunc["-"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] - this.inputs[1][0];
  };
  bopFunc["-"].ia = function(inNumSamples) {
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

  bopFunc["*"] = function(a, b) {
    return a * b;
  };
  bopFunc["*"].aa = function(inNumSamples) {
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
  bopFunc["*"].ak = function(inNumSamples) {
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
  bopFunc["*"].ai = function(inNumSamples) {
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
  bopFunc["*"].ka = function(inNumSamples) {
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
  bopFunc["*"].kk = function() {
    this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0];
  };
  bopFunc["*"].ia = function(inNumSamples) {
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

  bopFunc["/"] = function(a, b) {
    return b === 0 ? 0 : a / b;
  };
  bopFunc["%"] = function(a, b) {
    return b === 0 ? 0 : a % b;
  };

  bopFunc.eq = function(a, b) {
    return a === b ? 1 : 0;
  };
  bopFunc.ne = function(a, b) {
    return a !== b ? 1 : 0;
  };
  bopFunc.lt = function(a, b) {
    return a < b ? 1 : 0;
  };
  bopFunc.gt = function(a, b) {
    return a > b ? 1 : 0;
  };
  bopFunc.le = function(a, b) {
    return a <= b ? 1 : 0;
  };
  bopFunc.ge = function(a, b) {
    return a >= b ? 1 : 0;
  };
  bopFunc.bitAnd = function(a, b) {
    return a & b;
  };
  bopFunc.bitOr = function(a, b) {
    return a | b;
  };
  bopFunc.bitXor = function(a, b) {
    return a ^ b;
  };
  bopFunc.min = function(a, b) {
    return Math.min(a, b);
  };
  bopFunc.max = function(a, b) {
    return Math.max(a, b);
  };
  var gcd = function(a, b, t) {
    a = a|0; b = b|0;
    while (b !== 0) {
      t = a % b; a = b; b = t;
    }
    return Math.abs(a);
  };
  bopFunc.lcm = function(a, b) {
    if (a === 0 && b === 0) {
      return 0;
    }
    return Math.abs(a * b) / gcd(a, b);
  };
  bopFunc.gcd = function(a, b) {
    return gcd(a, b);
  };
  bopFunc.round = function(a, b) {
    return b === 0 ? a : Math.round(a / b) * b;
  };
  bopFunc.roundUp = function(a, b) {
    return b === 0 ? a : Math.ceil(a / b) * b;
  };
  bopFunc.roundDown = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  bopFunc.trunc = function(a, b) {
    return b === 0 ? a : Math.floor(a / b) * b;
  };
  bopFunc.atan2 = function(a, b) {
    return Math.atan2(a, b);
  };
  bopFunc.hypot = function(a, b) {
    return Math.sqrt((a * a) + (b * b));
  };
  bopFunc.hypotApx = function(a, b) {
    var x = Math.abs(a), y = Math.abs(b);
    var minxy = Math.min(x, y);
    return x + y - (Math.sqrt(2) - 1) * minxy;
  };
  bopFunc.pow = function(a, b) {
    return Math.pow(Math.abs(a), b);
  };
  bopFunc.leftShift = function(a, b) {
    if (b < 0) {
      return (a|0) >> (-b|0);
    }
    return (a|0) << (b|0);
  };
  bopFunc.rightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  bopFunc.unsignedRightShift = function(a, b) {
    if (b < 0) {
      return (a|0) << (-b|0);
    }
    return (a|0) >> (b|0);
  };
  bopFunc.ring1 = function(a, b) {
    return a * b + a;
  };
  bopFunc.ring2 = function(a, b) {
    return a * b + a + b;
  };
  bopFunc.ring3 = function(a, b) {
    return a * a * b;
  };
  bopFunc.ring4 = function(a, b) {
    return a * a * b - a * b * b;
  };
  bopFunc.difsqr = function(a, b) {
    return a * a - b * b;
  };
  bopFunc.sumsqr = function(a, b) {
    return a * a + b * b;
  };
  bopFunc.sqrsum = function(a, b) {
    return (a + b) * (a + b);
  };
  bopFunc.sqrdif = function(a, b) {
    return (a - b) * (a - b);
  };
  bopFunc.absdif = function(a, b) {
    return Math.abs(a - b);
  };
  bopFunc.thresh = function(a, b) {
    return a < b ? 0 : a;
  };
  bopFunc.amclip = function(a, b) {
    return a * 0.5 * (b + Math.abs(b));
  };
  bopFunc.scaleneg = function(a, b) {
    b = 0.5 * b + 0.5;
    return (Math.abs(a) - a) * b + a;
  };
  bopFunc.clip2 = function(a, b) {
    return Math.max(-b, Math.min(a, b));
  };
  bopFunc.excess = function(a, b) {
    return a - Math.max(-b, Math.min(a, b));
  };
  bopFunc.fold2 = function(val, hi) {
    var x, range1, range2;
    if (hi === 0) {
      return 0;
    }
    range1 = hi + hi;
    if (val >= hi) {
      val = range1 - val;
      if (val >= -hi) {
        return val;
      }
    } else if (val < -hi) {
      val = -range1 - val;
      if (val < hi) {
        return val;
      }
    } else {
      return val;
    }
    
    range2 = range1 + range1;
    x = val + hi;
    x -= range2 * Math.floor(x / range2);
    if (x >= range1) {
      return range2 - x - hi;
    }
    return x - hi;
  };
  bopFunc.wrap2 = function(val, hi) {
    if (hi === 0) {
      return 0;
    }
    var range = hi * 2;
    if (val >= hi) {
      val -= range;
      if (val < hi) {
        return val;
      }
    } else if (val < -hi) {
      val += range;
      if (val >= -hi) {
        return val;
      }
    } else {
      return val;
    }
    return val - range * Math.floor((val + hi) / range);
  };
  
  
  Object.keys(bopFunc).forEach(function(key) {
    var func = bopFunc[key];
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
    func.dd = binary_dd(func);
  });
  
  cc.unit.specs.Control = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      this.outputs[0][0] = this.parent.controls[this.specialIndex];
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = outputs.length;
      for (var i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        outputs[i][0] = controls[j];
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.LagControl = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      var numChannels = this.numOfOutputs;
      var y1 = this._y1 = new Float32Array(numChannels);
      var b1 = this._b1 = new Float32Array(numChannels);
      var controls = this.parent.controls;
      var inputs   = this.inputs;
      var sampleRate = this.rate.sampleRate;
      var lag;
      for (var i = 0; i < numChannels; ++i) {
        y1[i] = controls[i];
        lag   = inputs[i][0];
        b1[i] = lag === 0 ? 0 : Math.exp(log001 / (lag * sampleRate));
      }
      this.process(1);
    };
    var next_1 = function() {
      var y1 = this._y1;
      var b1 = this._b1;
      var z = this.parent.controls[this.specialIndex];
      var x = z + b1[0] * (y1[0] - z);
      this.outputs[0][0] = y1[0] = x;
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = this.outputs.length;
      var y1 = this._y1;
      var b1 = this._b1;
      var z, x, i, j;
      for (i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        z = controls[j];
        x = z + b1[i] * (y1[i] - z);
        outputs[i][0] = y1[i] = x;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.TrigControl = (function() {
    var ctor = function() {
      if (this.numOfOutputs === 1) {
        this.process = next_1;
      } else {
        this.process = next_k;
      }
      this.process(1);
    };
    var next_1 = function() {
      var controls     = this.parent.controls;
      var specialIndex = this.specialIndex;
      this.outputs[0][0] = controls[specialIndex];
      controls[specialIndex] = 0;
    };
    var next_k = function() {
      var controls = this.parent.controls;
      var outputs  = this.outputs;
      var numChannels = outputs.length;
      for (var i = 0, j = this.specialIndex; i < numChannels; ++i, ++j) {
        outputs[i][0] = controls[j];
        controls[j] = 0;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.Out = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * C.AUDIO_BUS_LEN;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var bufLength = this._bufLength;
      var offset, _in;
      var fbusChannel = (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        offset = (fbusChannel + i) * bufLength;
        _in = inputs[i];
        for (var j = 0; j < inNumSamples; j++) {
          bus[offset + j] += _in[j];
        }
      }
    };
    var next_k = function(inNumSamples, instance) {
      var inputs = this.inputs;
      var bus    = instance.bus;
      var offset    = this._busOffset + (inputs[0][0]|0) - 1;
      for (var i = 1, imax = inputs.length; i < imax; ++i) {
        bus[offset + i] += inputs[i][0];
      }
    };
    return ctor;
  })();

  cc.unit.specs.MulAdd = (function() {
    var ctor = function() {
      if (this.calcRate === C.DEMAND) {
        this.process = next[C.DEMAND];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]];
        this._in  = this.inputs[0][0];
        this._mul = this.inputs[1][0];
        this._add = this.inputs[2][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in * this._mul + this._add;
        }
      }
    };
    
    var next = {};
    next[C.AUDIO] = {};
    next[C.AUDIO][C.AUDIO] = {};
    next[C.AUDIO][C.CONTROL] = {};
    next[C.AUDIO][C.SCALAR] = {};
    next[C.CONTROL] = {};
    next[C.CONTROL][C.AUDIO] = {};
    next[C.CONTROL][C.CONTROL] = {};
    next[C.CONTROL][C.SCALAR] = {};
    next[C.SCALAR] = {};
    next[C.SCALAR][C.AUDIO] = {};
    next[C.SCALAR][C.CONTROL] = {};
    next[C.SCALAR][C.SCALAR] = {};

    next[C.AUDIO][C.AUDIO][C.AUDIO] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + addIn[i  ];
        out[i+1] = inIn[i+1] * mulIn[i+1] + addIn[i+1];
        out[i+2] = inIn[i+2] * mulIn[i+2] + addIn[i+2];
        out[i+3] = inIn[i+3] * mulIn[i+3] + addIn[i+3];
        out[i+4] = inIn[i+4] * mulIn[i+4] + addIn[i+4];
        out[i+5] = inIn[i+5] * mulIn[i+5] + addIn[i+5];
        out[i+6] = inIn[i+6] * mulIn[i+6] + addIn[i+6];
        out[i+7] = inIn[i+7] * mulIn[i+7] + addIn[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + add; add += add_slope;
        out[i+1] = inIn[i+1] * mulIn[i+1] + add; add += add_slope;
        out[i+2] = inIn[i+2] * mulIn[i+2] + add; add += add_slope;
        out[i+3] = inIn[i+3] * mulIn[i+3] + add; add += add_slope;
        out[i+4] = inIn[i+4] * mulIn[i+4] + add; add += add_slope;
        out[i+5] = inIn[i+5] * mulIn[i+5] + add; add += add_slope;
        out[i+6] = inIn[i+6] * mulIn[i+6] + add; add += add_slope;
        out[i+7] = inIn[i+7] * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mulIn[i  ] + add;
        out[i+1] = inIn[i+1] * mulIn[i+1] + add;
        out[i+2] = inIn[i+2] * mulIn[i+2] + add;
        out[i+3] = inIn[i+3] * mulIn[i+3] + add;
        out[i+4] = inIn[i+4] * mulIn[i+4] + add;
        out[i+5] = inIn[i+5] * mulIn[i+5] + add;
        out[i+6] = inIn[i+6] * mulIn[i+6] + add;
        out[i+7] = inIn[i+7] * mulIn[i+7] + add;
      }
    };
    next[C.AUDIO][C.CONTROL][C.AUDIO] = function(inNumSamples) {
      var out   = this.outputs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + addIn[i  ]; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + addIn[i+1]; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + addIn[i+2]; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + addIn[i+3]; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + addIn[i+4]; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + addIn[i+5]; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + addIn[i+6]; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope; add += add_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope; add += add_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope; add += add_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope; add += add_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope; add += add_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope; add += add_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope; add += add_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope; add += add_slope;
      }
      this._mul = nextMul;
      this._add = nextAdd;
    };
    next[C.AUDIO][C.CONTROL][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.AUDIO][C.SCALAR][C.AUDIO] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + addIn[i  ];
        out[i+1] = inIn[i+1] * mul + addIn[i+1];
        out[i+2] = inIn[i+2] * mul + addIn[i+2];
        out[i+3] = inIn[i+3] * mul + addIn[i+3];
        out[i+4] = inIn[i+4] * mul + addIn[i+4];
        out[i+5] = inIn[i+5] * mul + addIn[i+5];
        out[i+6] = inIn[i+6] * mul + addIn[i+6];
        out[i+7] = inIn[i+7] * mul + addIn[i+7];
      }
    };
    next[C.AUDIO][C.SCALAR][C.CONTROL] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; add += add_slope;
        out[i+1] = inIn[i+1] * mul + add; add += add_slope;
        out[i+2] = inIn[i+2] * mul + add; add += add_slope;
        out[i+3] = inIn[i+3] * mul + add; add += add_slope;
        out[i+4] = inIn[i+4] * mul + add; add += add_slope;
        out[i+5] = inIn[i+5] * mul + add; add += add_slope;
        out[i+6] = inIn[i+6] * mul + add; add += add_slope;
        out[i+7] = inIn[i+7] * mul + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var mul  = this._mul;
      var add  = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        out[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        out[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        out[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        out[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        out[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        out[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        out[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.CONTROL][C.CONTROL][C.AUDIO] = function(inNumSamples) {
      var out   = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ]; _in += in_slope; mul += mul_slope;
        out[i+1] = _in * mul + addIn[i+1]; _in += in_slope; mul += mul_slope;
        out[i+2] = _in * mul + addIn[i+2]; _in += in_slope; mul += mul_slope;
        out[i+3] = _in * mul + addIn[i+3]; _in += in_slope; mul += mul_slope;
        out[i+4] = _in * mul + addIn[i+4]; _in += in_slope; mul += mul_slope;
        out[i+5] = _in * mul + addIn[i+5]; _in += in_slope; mul += mul_slope;
        out[i+6] = _in * mul + addIn[i+6]; _in += in_slope; mul += mul_slope;
        out[i+7] = _in * mul + addIn[i+7]; _in += in_slope; mul += mul_slope;
      }
      this._in  = nextIn;
      this._mul = nextMul;
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this.inputs[2][0];
    };
    next[C.CONTROL][C.CONTROL][C.SCALAR] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this._add;
    };
    next[C.CONTROL][C.SCALAR][C.AUDIO] = function(inNumSamples) {
      var out = this.outputs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = _in * mul + addIn[i  ]; _in += in_slope;
        out[i+1] = _in * mul + addIn[i+1]; _in += in_slope;
        out[i+2] = _in * mul + addIn[i+2]; _in += in_slope;
        out[i+3] = _in * mul + addIn[i+3]; _in += in_slope;
        out[i+4] = _in * mul + addIn[i+4]; _in += in_slope;
        out[i+5] = _in * mul + addIn[i+5]; _in += in_slope;
        out[i+6] = _in * mul + addIn[i+6]; _in += in_slope;
        out[i+7] = _in * mul + addIn[i+7]; _in += in_slope;
      }
      this._in  = nextIn;
    };
    next[C.CONTROL][C.SCALAR][C.CONTROL] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this._mul + this.inputs[2][0];
    };
    next[C.CONTROL][C.SCALAR][C.SCALAR] = function() {
      this.outputs[0][0] = this.inputs[0][0] * this._mul + this._add;
    };
    next[C.DEMAND] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) ? NaN : (a * b) + c;
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
      }
    };
    
    return ctor;
  })();

  cc.unit.specs.Sum3 = (function() {
    var ctor = function() {
      if (this.calcRate === C.DEMAND) {
        this.process = next[C.DEMAND];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]];
        this._in0 = this.inputs[0][0];
        this._in1 = this.inputs[1][0];
        this._in2 = this.inputs[2][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in0 + this._in1 + this._in2;
        }
      }
    };
    
    var next = {};
    next[C.AUDIO] = {};
    next[C.AUDIO][C.AUDIO] = {};
    next[C.AUDIO][C.CONTROL] = {};
    next[C.AUDIO][C.SCALAR] = {};
    next[C.CONTROL] = {};
    next[C.CONTROL][C.CONTROL] = {};
    next[C.CONTROL][C.SCALAR] = {};
    next[C.SCALAR] = {};
    next[C.SCALAR][C.SCALAR] = {};

    next[C.AUDIO][C.AUDIO][C.AUDIO] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ];
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1];
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2];
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3];
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4];
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5];
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6];
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      var nextIn2 = this.inputs[2][0];
      var in2_slope = (nextIn2 - in2) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in2; in2 += in2_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in2; in2 += in2_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in2; in2 += in2_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in2; in2 += in2_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in2; in2 += in2_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in2; in2 += in2_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in2; in2 += in2_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in2; in2 += in2_slope;
      }
      this._in2 = nextIn2;
    };
    next[C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in2;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in2;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in2;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in2;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in2;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in2;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in2;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in2;
      }
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      var nextIn12 = this.inputs[1][0] + this.inputs[2][0];
      var in12_slope = (nextIn12 - in12) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in12; in12 += in12_slope;
        out[i+1] = inIn0[i+1] + in12; in12 += in12_slope;
        out[i+2] = inIn0[i+2] + in12; in12 += in12_slope;
        out[i+3] = inIn0[i+3] + in12; in12 += in12_slope;
        out[i+4] = inIn0[i+4] + in12; in12 += in12_slope;
        out[i+5] = inIn0[i+5] + in12; in12 += in12_slope;
        out[i+6] = inIn0[i+6] + in12; in12 += in12_slope;
        out[i+7] = inIn0[i+7] + in12; in12 += in12_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
    };
    next[C.AUDIO][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in12;
        out[i+1] = inIn0[i+1] + in12;
        out[i+2] = inIn0[i+2] + in12;
        out[i+3] = inIn0[i+3] + in12;
        out[i+4] = inIn0[i+4] + in12;
        out[i+5] = inIn0[i+5] + in12;
        out[i+6] = inIn0[i+6] + in12;
        out[i+7] = inIn0[i+7] + in12;
      }
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0];
    };
    next[C.CONTROL][C.CONTROL][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL];

    next[C.DEMAND] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) ? NaN : (a + b + c);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
      }
    };
    
    return ctor;
  })();
  
  cc.unit.specs.Sum4 = (function() {
    var ctor = function() {
      if (this.calcRate === C.DEMAND) {
        this.process = next[C.DEMAND];
      } else {
        var rates = this.inRates;
        this.process = next[rates[0]][rates[1]][rates[2]][rates[3]];
        this._in0 = this.inputs[0][0];
        this._in1 = this.inputs[1][0];
        this._in2 = this.inputs[2][0];
        this._in3 = this.inputs[3][0];
        if (this.process) {
          this.process(1);
        } else {
          this.outputs[0][0] = this._in0 * this._in1 + this._in2 + this._in3;
        }
      }
    };

    var next = {};
    next[C.AUDIO] = {};
    next[C.AUDIO][C.AUDIO] = {};
    next[C.AUDIO][C.AUDIO][C.AUDIO] = {};
    next[C.AUDIO][C.AUDIO][C.CONTROL] = {};
    next[C.AUDIO][C.AUDIO][C.SCALAR] = {};
    next[C.AUDIO][C.CONTROL] = {};
    next[C.AUDIO][C.CONTROL][C.CONTROL] = {};
    next[C.AUDIO][C.CONTROL][C.SCALAR] = {};
    next[C.AUDIO][C.SCALAR] = {};
    next[C.AUDIO][C.SCALAR][C.SCALAR] = {};
    next[C.CONTROL] = {};
    next[C.CONTROL][C.CONTROL] = {};
    next[C.CONTROL][C.CONTROL][C.CONTROL] = {};
    next[C.CONTROL][C.CONTROL][C.SCALAR] = {};
    next[C.CONTROL][C.SCALAR] = {};
    next[C.CONTROL][C.SCALAR][C.SCALAR] = {};
    next[C.SCALAR] = {};
    next[C.SCALAR][C.SCALAR] = {};
    next[C.SCALAR][C.SCALAR][C.SCALAR] = {};
    
    next[C.AUDIO][C.AUDIO][C.AUDIO][C.AUDIO] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var inIn3 = this.inputs[3];
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + inIn3[i  ];
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + inIn3[i+1];
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + inIn3[i+2];
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + inIn3[i+3];
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + inIn3[i+4];
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + inIn3[i+5];
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + inIn3[i+6];
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + inIn3[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      var nextIn3 = this.inputs[3][0];
      var in3_slope = (nextIn3 - in3) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3; in3 += in3_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3; in3 += in3_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3; in3 += in3_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3; in3 += in3_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3; in3 += in3_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3; in3 += in3_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3; in3 += in3_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3; in3 += in3_slope;
      }
      this._in3 = nextIn3;
    };
    next[C.AUDIO][C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3;
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      var nextIn23 = this.inputs[2][0] + this.inputs[3][0];
      var in23_slope = (nextIn23 - in23) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in23; in23 += in23_slope;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in23; in23 += in23_slope;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in23; in23 += in23_slope;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in23; in23 += in23_slope;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in23; in23 += in23_slope;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in23; in23 += in23_slope;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in23; in23 += in23_slope;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in23; in23 += in23_slope;
      }
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[2][0];
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.AUDIO][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + inIn1[i  ] + in23;
        out[i+1] = inIn0[i+1] + inIn1[i+1] + in23;
        out[i+2] = inIn0[i+2] + inIn1[i+2] + in23;
        out[i+3] = inIn0[i+3] + inIn1[i+3] + in23;
        out[i+4] = inIn0[i+4] + inIn1[i+4] + in23;
        out[i+5] = inIn0[i+5] + inIn1[i+5] + in23;
        out[i+6] = inIn0[i+6] + inIn1[i+6] + in23;
        out[i+7] = inIn0[i+7] + inIn1[i+7] + in23;
      }
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      var nextIn123 = this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
      var in123_slope = (nextIn123 - in123) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in123; in123 += in123_slope;
        out[i+1] = inIn0[i+1] + in123; in123 += in123_slope;
        out[i+2] = inIn0[i+2] + in123; in123 += in123_slope;
        out[i+3] = inIn0[i+3] + in123; in123 += in123_slope;
        out[i+4] = inIn0[i+4] + in123; in123 += in123_slope;
        out[i+5] = inIn0[i+5] + in123; in123 += in123_slope;
        out[i+6] = inIn0[i+6] + in123; in123 += in123_slope;
        out[i+7] = inIn0[i+7] + in123; in123 += in123_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.CONTROL][C.SCALAR][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.SCALAR][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      var out = this.outputs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        out[i  ] = inIn0[i  ] + in123;
        out[i+1] = inIn0[i+1] + in123;
        out[i+2] = inIn0[i+2] + in123;
        out[i+3] = inIn0[i+3] + in123;
        out[i+4] = inIn0[i+4] + in123;
        out[i+5] = inIn0[i+5] + in123;
        out[i+6] = inIn0[i+6] + in123;
        out[i+7] = inIn0[i+7] + in123;
      }
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outputs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.CONTROL][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.SCALAR][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];
    
    next[C.DEMAND] = function(inNumSamples) {
      if (inNumSamples) {
        var a = calcDemandInput(this, 0, inNumSamples);
        var b = calcDemandInput(this, 1, inNumSamples);
        var c = calcDemandInput(this, 2, inNumSamples);
        var d = calcDemandInput(this, 3, inNumSamples);
        this.outputs[0][0] = isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d) ? NaN : (a + b + c + d);
      } else {
        resetDemandInput(this, 0);
        resetDemandInput(this, 1);
        resetDemandInput(this, 2);
        resetDemandInput(this, 3);
      }
    };
    
    return ctor;
  })();
  
  module.exports = {
    uopFunc: uopFunc,
    unary_k: unary_k,
    unary_a: unary_a,
    bopFunc: bopFunc,
    binary_aa: binary_aa,
    binary_ak: binary_ak,
    binary_ai: binary_ai,
    binary_ka: binary_ka,
    binary_kk: binary_kk,
    binary_ia: binary_ia,
  };

});
