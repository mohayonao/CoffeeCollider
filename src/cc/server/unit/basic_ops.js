define(function(require, exports, module) {
  "use strict";

  var unit = require("./unit");
  var ops  = require("../ugen/basic_ops");

  var UnaryOpUGen = (function() {
    var UNARY_OP_UGEN_MAP = ops.UNARY_OP_UGEN_MAP;
    
    var calcFunc = {};
    
    var UnaryOpUGen = function() {
      var ctor = function() {
        var func = calcFunc[UNARY_OP_UGEN_MAP[this.specialIndex]];
        var process;
        if (func) {
          switch (this.inRates[0]) {
          case C.AUDIO  : process = func.a; break;
          case C.CONTROL: process = func.k; break;
          }
          this.process = process;
          if (this.process) {
            this.process(1);
          } else {
            this.outs[0][0] = func(this.inputs[0][0]);
          }
        } else {
          console.log("UnaryOpUGen[" + this.specialIndex + "] is not defined.");
        }
      };
      return ctor;
    };
    
    var k = function(func) {
      return function() {
        this.outs[0][0] = func(this.inputs[0][0]);
      };
    };
    var a = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var out = this.outs[0];
        var a = this.inputs[0];
        for (var i = 0; i < inNumSamples; i += 8) {
          out[i  ] = func(a[i  ]); out[i+1] = func(a[i+1]);
          out[i+2] = func(a[i+2]); out[i+3] = func(a[i+3]);
          out[i+4] = func(a[i+4]); out[i+5] = func(a[i+5]);
          out[i+6] = func(a[i+6]); out[i+7] = func(a[i+7]);
        }
      };
    };

    calcFunc.num = function(a) {
      return +a;
    };
    calcFunc.neg = function(a) {
      return -a;
    };
    calcFunc.not = function(a) {
      return a > 0 ? 0 : 1;
    };
    calcFunc.tilde = function(a) {
      return ~a;
    };
    
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      if (!func.a) { func.a = a(func); }
      if (!func.k) { func.k = k(func); }
    });
    
    return UnaryOpUGen;
  })();

  var BinaryOpUGen = (function() {
    var BINARY_OP_UGEN_MAP = ops.BINARY_OP_UGEN_MAP;

    var AA = C.AUDIO   * 10 + C.AUDIO;
    var AK = C.AUDIO   * 10 + C.CONTROL;
    var AI = C.AUDIO   * 10 + C.SCALAR;
    var KA = C.CONTROL * 10 + C.AUDIO;
    var KK = C.CONTROL * 10 + C.CONTROL;
    var KI = C.CONTROL * 10 + C.SCALAR;
    var IA = C.SCALAR  * 10 + C.AUDIO;
    var IK = C.SCALAR  * 10 + C.CONTROL;
    var II = C.SCALAR  * 10 + C.SCALAR;

    var calcFunc = {};
    
    var BinaryOpUGen = function() {
      var ctor = function() {
        var func = calcFunc[BINARY_OP_UGEN_MAP[this.specialIndex]];
        var process;
        if (func) {
          switch (this.inRates[0] * 10 + this.inRates[1]) {
          case AA: process = func.aa; break;
          case AK: process = func.ak; break;
          case AI: process = func.ai; break;
          case KA: process = func.ka; break;
          case KK: process = func.kk; break;
          case KI: process = func.ki; break;
          case IA: process = func.ia; break;
          case IK: process = func.ik; break;
          case II: process = func.ii; break;
          }
          this.process = process;
          this._a = this.inputs[0][0];
          this._b = this.inputs[1][0];
          if (this.process) {
            this.process(1);
          } else {
            this.outs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
          }
        } else {
          console.log("BinaryOpUGen[" + this.specialIndex + "] is not defined.");
        }
      };
      return ctor;
    };

    var aa = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var out = this.outs[0];
        var aIn = this.inputs[0], bIn = this.inputs[1];
        for (var i = 0; i < inNumSamples; i += 8) {
          out[i  ] = func(aIn[i  ], bIn[i  ]); out[i+1] = func(aIn[i+1], bIn[i+1]);
          out[i+2] = func(aIn[i+2], bIn[i+2]); out[i+3] = func(aIn[i+3], bIn[i+3]);
          out[i+4] = func(aIn[i+4], bIn[i+4]); out[i+5] = func(aIn[i+5], bIn[i+5]);
          out[i+6] = func(aIn[i+6], bIn[i+6]); out[i+7] = func(aIn[i+7], bIn[i+7]);
        }
      };
    };
    var ak = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var outs = this.outs[0];
        var aIn  = this.inputs[0], b = this._b;
        var nextB  = this.inputs[1][0];
        var b_slope = (nextB - this._b) * this.rate.slopeFactor;
        for (var i = 0; i < inNumSamples; i += 8) {
          outs[i  ] = func(aIn[i  ], b); b += b_slope;
          outs[i+1] = func(aIn[i+1], b); b += b_slope;
          outs[i+2] = func(aIn[i+2], b); b += b_slope;
          outs[i+3] = func(aIn[i+3], b); b += b_slope;
          outs[i+4] = func(aIn[i+4], b); b += b_slope;
          outs[i+5] = func(aIn[i+5], b); b += b_slope;
          outs[i+6] = func(aIn[i+6], b); b += b_slope;
          outs[i+7] = func(aIn[i+7], b); b += b_slope;
        }
        this._b = nextB;
      };
    };
    var ai = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var outs = this.outs[0];
        var aIn = this.inputs[0], b = this._b;
        for (var i = 0; i < inNumSamples; i += 8) {
          outs[i  ] = func(aIn[i  ], b);
          outs[i+1] = func(aIn[i+1], b);
          outs[i+2] = func(aIn[i+2], b);
          outs[i+3] = func(aIn[i+3], b);
          outs[i+4] = func(aIn[i+4], b);
          outs[i+5] = func(aIn[i+5], b);
          outs[i+6] = func(aIn[i+6], b);
          outs[i+7] = func(aIn[i+7], b);
        }
      };
    };
    var ka = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var outs = this.outs[0];
        var a = this._a, bIn = this.inputs[1];
        var nextA  = this.inputs[0][0];
        var a_slope = (nextA - this._a) * this.rate.slopeFactor;
        for (var i = 0; i < inNumSamples; i += 8) {
          outs[i  ] = func(a, bIn[i  ]); a += a_slope;
          outs[i+1] = func(a, bIn[i+1]); a += a_slope;
          outs[i+2] = func(a, bIn[i+2]); a += a_slope;
          outs[i+3] = func(a, bIn[i+3]); a += a_slope;
          outs[i+4] = func(a, bIn[i+4]); a += a_slope;
          outs[i+5] = func(a, bIn[i+5]); a += a_slope;
          outs[i+6] = func(a, bIn[i+6]); a += a_slope;
          outs[i+7] = func(a, bIn[i+7]); a += a_slope;
        }
        this._a = nextA;
      };
    };
    var kk = function(func) {
      return function() {
        this.outs[0][0] = func(this.inputs[0][0], this.inputs[1][0]);
      };
    };
    var ia = function(func) {
      return function(inNumSamples) {
        inNumSamples = inNumSamples|0;
        var outs = this.outs[0];
        var a = this._a, bIn = this.inputs[1];
        for (var i = 0; i < inNumSamples; i += 8) {
          outs[i  ] = func(a, bIn[i  ]);
          outs[i+1] = func(a, bIn[i+1]);
          outs[i+2] = func(a, bIn[i+2]);
          outs[i+3] = func(a, bIn[i+3]);
          outs[i+4] = func(a, bIn[i+4]);
          outs[i+5] = func(a, bIn[i+5]);
          outs[i+6] = func(a, bIn[i+6]);
          outs[i+7] = func(a, bIn[i+7]);
        }
      };
    };

    calcFunc["+"] = function(a, b) {
      return a + b;
    };
    calcFunc["+"].aa = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0];
    };
    calcFunc["+"].ia = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      this.outs[0][0] = this.inputs[0][0] - this.inputs[1][0];
    };
    calcFunc["-"].ia = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
      var aIn  = this.inputs[0], b = this._b;
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
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
      this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0];
    };
    calcFunc["*"].ia = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var out = this.outs[0];
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
    
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      if (!func.aa) { func.aa = aa(func); }
      if (!func.ak) { func.ak = ak(func); }
      if (!func.ai) { func.ai = ai(func); }
      if (!func.ka) { func.ka = ka(func); }
      if (!func.kk) { func.kk = kk(func); }
      if (!func.ki) { func.ki = func.kk;  }
      if (!func.ia) { func.ia = ia(func); }
      if (!func.ik) { func.ik = func.kk;  }
    });
    
    return BinaryOpUGen;
  })();
  
  var MulAdd = function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]];
      this.process = process;
      this._in  = this.inputs[0][0];
      this._mul = this.inputs[1][0];
      this._add = this.inputs[2][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outs[0][0] = this._in * this._mul + this._add;
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
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + addIn[i  ];
        outs[i+1] = inIn[i+1] * mulIn[i+1] + addIn[i+1];
        outs[i+2] = inIn[i+2] * mulIn[i+2] + addIn[i+2];
        outs[i+3] = inIn[i+3] * mulIn[i+3] + addIn[i+3];
        outs[i+4] = inIn[i+4] * mulIn[i+4] + addIn[i+4];
        outs[i+5] = inIn[i+5] * mulIn[i+5] + addIn[i+5];
        outs[i+6] = inIn[i+6] * mulIn[i+6] + addIn[i+6];
        outs[i+7] = inIn[i+7] * mulIn[i+7] + addIn[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + add; add += add_slope;
        outs[i+1] = inIn[i+1] * mulIn[i+1] + add; add += add_slope;
        outs[i+2] = inIn[i+2] * mulIn[i+2] + add; add += add_slope;
        outs[i+3] = inIn[i+3] * mulIn[i+3] + add; add += add_slope;
        outs[i+4] = inIn[i+4] * mulIn[i+4] + add; add += add_slope;
        outs[i+5] = inIn[i+5] * mulIn[i+5] + add; add += add_slope;
        outs[i+6] = inIn[i+6] * mulIn[i+6] + add; add += add_slope;
        outs[i+7] = inIn[i+7] * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mulIn[i  ] + add;
        outs[i+1] = inIn[i+1] * mulIn[i+1] + add;
        outs[i+2] = inIn[i+2] * mulIn[i+2] + add;
        outs[i+3] = inIn[i+3] * mulIn[i+3] + add;
        outs[i+4] = inIn[i+4] * mulIn[i+4] + add;
        outs[i+5] = inIn[i+5] * mulIn[i+5] + add;
        outs[i+6] = inIn[i+6] * mulIn[i+6] + add;
        outs[i+7] = inIn[i+7] * mulIn[i+7] + add;
      }
    };
    next[C.AUDIO][C.CONTROL][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + addIn[i  ]; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + addIn[i+1]; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + addIn[i+2]; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + addIn[i+3]; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + addIn[i+4]; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + addIn[i+5]; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + addIn[i+6]; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add   = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope; add += add_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope; add += add_slope;
      }
      this._mul = nextMul;
      this._add = nextAdd;
    };
    next[C.AUDIO][C.CONTROL][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.AUDIO][C.SCALAR][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + addIn[i  ];
        outs[i+1] = inIn[i+1] * mul + addIn[i+1];
        outs[i+2] = inIn[i+2] * mul + addIn[i+2];
        outs[i+3] = inIn[i+3] * mul + addIn[i+3];
        outs[i+4] = inIn[i+4] * mul + addIn[i+4];
        outs[i+5] = inIn[i+5] * mul + addIn[i+5];
        outs[i+6] = inIn[i+6] * mul + addIn[i+6];
        outs[i+7] = inIn[i+7] * mul + addIn[i+7];
      }
    };
    next[C.AUDIO][C.SCALAR][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add   = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; add += add_slope;
        outs[i+1] = inIn[i+1] * mul + add; add += add_slope;
        outs[i+2] = inIn[i+2] * mul + add; add += add_slope;
        outs[i+3] = inIn[i+3] * mul + add; add += add_slope;
        outs[i+4] = inIn[i+4] * mul + add; add += add_slope;
        outs[i+5] = inIn[i+5] * mul + add; add += add_slope;
        outs[i+6] = inIn[i+6] * mul + add; add += add_slope;
        outs[i+7] = inIn[i+7] * mul + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn  = this.inputs[0];
      var mul   = this._mul;
      var add = this._add;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn[i  ] * mul + add; mul += mul_slope;
        outs[i+1] = inIn[i+1] * mul + add; mul += mul_slope;
        outs[i+2] = inIn[i+2] * mul + add; mul += mul_slope;
        outs[i+3] = inIn[i+3] * mul + add; mul += mul_slope;
        outs[i+4] = inIn[i+4] * mul + add; mul += mul_slope;
        outs[i+5] = inIn[i+5] * mul + add; mul += mul_slope;
        outs[i+6] = inIn[i+6] * mul + add; mul += mul_slope;
        outs[i+7] = inIn[i+7] * mul + add; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.CONTROL][C.CONTROL][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; _in += in_slope; mul += mul_slope;
        outs[i+1] = _in * mul + addIn[i+1]; _in += in_slope; mul += mul_slope;
        outs[i+2] = _in * mul + addIn[i+2]; _in += in_slope; mul += mul_slope;
        outs[i+3] = _in * mul + addIn[i+3]; _in += in_slope; mul += mul_slope;
        outs[i+4] = _in * mul + addIn[i+4]; _in += in_slope; mul += mul_slope;
        outs[i+5] = _in * mul + addIn[i+5]; _in += in_slope; mul += mul_slope;
        outs[i+6] = _in * mul + addIn[i+6]; _in += in_slope; mul += mul_slope;
        outs[i+7] = _in * mul + addIn[i+7]; _in += in_slope; mul += mul_slope;
      }
      this._in  = nextIn;
      this._mul = nextMul;
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this.inputs[2][0];
    };
    next[C.CONTROL][C.CONTROL][C.SCALAR] = function() {
      this.outs[0][0] = this.inputs[0][0] * this.inputs[1][0] + this._add;
    };
    next[C.CONTROL][C.SCALAR][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextIn = this.inputs[0][0];
      var in_slope = (nextIn - _in) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; _in += in_slope;
        outs[i+1] = _in * mul + addIn[i+1]; _in += in_slope;
        outs[i+2] = _in * mul + addIn[i+2]; _in += in_slope;
        outs[i+3] = _in * mul + addIn[i+3]; _in += in_slope;
        outs[i+4] = _in * mul + addIn[i+4]; _in += in_slope;
        outs[i+5] = _in * mul + addIn[i+5]; _in += in_slope;
        outs[i+6] = _in * mul + addIn[i+6]; _in += in_slope;
        outs[i+7] = _in * mul + addIn[i+7]; _in += in_slope;
      }
      this._in  = nextIn;
    };
    next[C.CONTROL][C.SCALAR][C.CONTROL] = function() {
      this.outs[0][0] = this.inputs[0][0] * this._mul + this.inputs[2][0];
    };
    next[C.CONTROL][C.SCALAR][C.SCALAR] = function() {
      this.outs[0][0] = this.inputs[0][0] * this._mul + this._add;
    };
    next[C.SCALAR][C.AUDIO][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + addIn[i  ];
        outs[i+1] = _in * mulIn[i+1] + addIn[i+1];
        outs[i+2] = _in * mulIn[i+2] + addIn[i+2];
        outs[i+3] = _in * mulIn[i+3] + addIn[i+3];
        outs[i+4] = _in * mulIn[i+4] + addIn[i+4];
        outs[i+5] = _in * mulIn[i+5] + addIn[i+5];
        outs[i+6] = _in * mulIn[i+6] + addIn[i+6];
        outs[i+7] = _in * mulIn[i+7] + addIn[i+7];
      }
    };
    next[C.SCALAR][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      var nextAdd = this.inputs[2][0];
      var add_slope = (nextAdd - add) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + add; add += add_slope;
        outs[i+1] = _in * mulIn[i+1] + add; add += add_slope;
        outs[i+2] = _in * mulIn[i+2] + add; add += add_slope;
        outs[i+3] = _in * mulIn[i+3] + add; add += add_slope;
        outs[i+4] = _in * mulIn[i+4] + add; add += add_slope;
        outs[i+5] = _in * mulIn[i+5] + add; add += add_slope;
        outs[i+6] = _in * mulIn[i+6] + add; add += add_slope;
        outs[i+7] = _in * mulIn[i+7] + add; add += add_slope;
      }
      this._add = nextAdd;
    };
    next[C.SCALAR][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mulIn = this.inputs[1];
      var add = this._add;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mulIn[i  ] + add;
        outs[i+1] = _in * mulIn[i+1] + add;
        outs[i+2] = _in * mulIn[i+2] + add;
        outs[i+3] = _in * mulIn[i+3] + add;
        outs[i+4] = _in * mulIn[i+4] + add;
        outs[i+5] = _in * mulIn[i+5] + add;
        outs[i+6] = _in * mulIn[i+6] + add;
        outs[i+7] = _in * mulIn[i+7] + add;
      }
    };
    next[C.SCALAR][C.CONTROL][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      var nextMul = this.inputs[1][0];
      var mul_slope = (nextMul - mul) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ]; mul += mul_slope;
        outs[i+1] = _in * mul + addIn[i+1]; mul += mul_slope;
        outs[i+2] = _in * mul + addIn[i+2]; mul += mul_slope;
        outs[i+3] = _in * mul + addIn[i+3]; mul += mul_slope;
        outs[i+4] = _in * mul + addIn[i+4]; mul += mul_slope;
        outs[i+5] = _in * mul + addIn[i+5]; mul += mul_slope;
        outs[i+6] = _in * mul + addIn[i+6]; mul += mul_slope;
        outs[i+7] = _in * mul + addIn[i+7]; mul += mul_slope;
      }
      this._mul = nextMul;
    };
    next[C.SCALAR][C.CONTROL][C.CONTROL] = function() {
      this.outs[0][0] = this._in * this.inputs[1][0] + this.inputs[2][0];
    };
    next[C.SCALAR][C.CONTROL][C.SCALAR] = function() {
      this.outs[0][0] = this._in * this.inputs[1][0] + this._add;
    };
    next[C.SCALAR][C.SCALAR][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var _in   = this._in;
      var mul   = this._mul;
      var addIn = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = _in * mul + addIn[i  ];
        outs[i+1] = _in * mul + addIn[i+1];
        outs[i+2] = _in * mul + addIn[i+2];
        outs[i+3] = _in * mul + addIn[i+3];
        outs[i+4] = _in * mul + addIn[i+4];
        outs[i+5] = _in * mul + addIn[i+5];
        outs[i+6] = _in * mul + addIn[i+6];
        outs[i+7] = _in * mul + addIn[i+7];
      }
    };
    next[C.SCALAR][C.SCALAR][C.CONTROL] = function() {
      this.outs[0][0] = this._in * this._mul + this.inputs[2][0];
    };
    return ctor;
  };

  var Sum3 = function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]];
      this.process = process;
      this._in0 = this.inputs[0][0];
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outs[0][0] = this._in0 * this._in1 + this._in2;
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

    next[C.AUDIO][C.AUDIO][C.AUDIO] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ];
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1];
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2];
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3];
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4];
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5];
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6];
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      var nextIn2 = this.inputs[2][0];
      var in2_slope = (nextIn2 - in2) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in2; in2 += in2_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in2; in2 += in2_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in2; in2 += in2_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in2; in2 += in2_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in2; in2 += in2_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in2; in2 += in2_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in2; in2 += in2_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in2; in2 += in2_slope;
      }
      this._in2 = nextIn2;
    };
    next[C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in2   = this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in2;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in2;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in2;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in2;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in2;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in2;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in2;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in2;
      }
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      var nextIn12 = this.inputs[1][0] + this.inputs[2][0];
      var in12_slope = (nextIn12 - in12) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in12; in12 += in12_slope;
        outs[i+1] = inIn0[i+1] + in12; in12 += in12_slope;
        outs[i+2] = inIn0[i+2] + in12; in12 += in12_slope;
        outs[i+3] = inIn0[i+3] + in12; in12 += in12_slope;
        outs[i+4] = inIn0[i+4] + in12; in12 += in12_slope;
        outs[i+5] = inIn0[i+5] + in12; in12 += in12_slope;
        outs[i+6] = inIn0[i+6] + in12; in12 += in12_slope;
        outs[i+7] = inIn0[i+7] + in12; in12 += in12_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
    };
    next[C.AUDIO][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in12  = this._in1 + this._in2;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in12;
        outs[i+1] = inIn0[i+1] + in12;
        outs[i+2] = inIn0[i+2] + in12;
        outs[i+3] = inIn0[i+3] + in12;
        outs[i+4] = inIn0[i+4] + in12;
        outs[i+5] = inIn0[i+5] + in12;
        outs[i+6] = inIn0[i+6] + in12;
        outs[i+7] = inIn0[i+7] + in12;
      }
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0];
    };
    next[C.CONTROL][C.CONTROL][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL];
    return ctor;
  };

  var Sum4 = function() {
    var ctor = function() {
      var rates = this.inRates;
      var process = next[rates[0]][rates[1]][rates[2]][rates[3]];
      this.process = process;
      this._in0 = this.inputs[0][0];
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
      if (this.process) {
        this.process(1);
      } else {
        this.outs[0][0] = this._in0 * this._in1 + this._in2 + this._in3;
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
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var inIn3 = this.inputs[3];
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + inIn3[i  ];
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + inIn3[i+1];
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + inIn3[i+2];
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + inIn3[i+3];
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + inIn3[i+4];
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + inIn3[i+5];
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + inIn3[i+6];
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + inIn3[i+7];
      }
    };
    next[C.AUDIO][C.AUDIO][C.AUDIO][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      var nextIn3 = this.inputs[3][0];
      var in3_slope = (nextIn3 - in3) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3; in3 += in3_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3; in3 += in3_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3; in3 += in3_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3; in3 += in3_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3; in3 += in3_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3; in3 += in3_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3; in3 += in3_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3; in3 += in3_slope;
      }
      this._in3 = nextIn3;
    };
    next[C.AUDIO][C.AUDIO][C.AUDIO][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var inIn2 = this.inputs[2];
      var in3   = this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + inIn2[i  ] + in3;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + inIn2[i+1] + in3;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + inIn2[i+2] + in3;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + inIn2[i+3] + in3;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + inIn2[i+4] + in3;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + inIn2[i+5] + in3;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + inIn2[i+6] + in3;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + inIn2[i+7] + in3;
      }
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      var nextIn23 = this.inputs[2][0] + this.inputs[3][0];
      var in23_slope = (nextIn23 - in23) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in23; in23 += in23_slope;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in23; in23 += in23_slope;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in23; in23 += in23_slope;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in23; in23 += in23_slope;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in23; in23 += in23_slope;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in23; in23 += in23_slope;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in23; in23 += in23_slope;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in23; in23 += in23_slope;
      }
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[2][0];
    };
    next[C.AUDIO][C.AUDIO][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.AUDIO][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.AUDIO][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var inIn1 = this.inputs[1];
      var in23  = this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + inIn1[i  ] + in23;
        outs[i+1] = inIn0[i+1] + inIn1[i+1] + in23;
        outs[i+2] = inIn0[i+2] + inIn1[i+2] + in23;
        outs[i+3] = inIn0[i+3] + inIn1[i+3] + in23;
        outs[i+4] = inIn0[i+4] + inIn1[i+4] + in23;
        outs[i+5] = inIn0[i+5] + inIn1[i+5] + in23;
        outs[i+6] = inIn0[i+6] + inIn1[i+6] + in23;
        outs[i+7] = inIn0[i+7] + inIn1[i+7] + in23;
      }
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      var nextIn123 = this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
      var in123_slope = (nextIn123 - in123) * this.rate.slopeFactor;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in123; in123 += in123_slope;
        outs[i+1] = inIn0[i+1] + in123; in123 += in123_slope;
        outs[i+2] = inIn0[i+2] + in123; in123 += in123_slope;
        outs[i+3] = inIn0[i+3] + in123; in123 += in123_slope;
        outs[i+4] = inIn0[i+4] + in123; in123 += in123_slope;
        outs[i+5] = inIn0[i+5] + in123; in123 += in123_slope;
        outs[i+6] = inIn0[i+6] + in123; in123 += in123_slope;
        outs[i+7] = inIn0[i+7] + in123; in123 += in123_slope;
      }
      this._in1 = this.inputs[1][0];
      this._in2 = this.inputs[2][0];
      this._in3 = this.inputs[3][0];
    };
    next[C.AUDIO][C.CONTROL][C.CONTROL][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.CONTROL][C.SCALAR][C.SCALAR] = next[C.AUDIO][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.AUDIO][C.SCALAR][C.SCALAR][C.SCALAR] = function(inNumSamples) {
      inNumSamples = inNumSamples|0;
      var outs = this.outs[0];
      var inIn0 = this.inputs[0];
      var in123 = this._in1 + this._in2 + this._in3;
      for (var i = 0; i < inNumSamples; i += 8) {
        outs[i  ] = inIn0[i  ] + in123;
        outs[i+1] = inIn0[i+1] + in123;
        outs[i+2] = inIn0[i+2] + in123;
        outs[i+3] = inIn0[i+3] + in123;
        outs[i+4] = inIn0[i+4] + in123;
        outs[i+5] = inIn0[i+5] + in123;
        outs[i+6] = inIn0[i+6] + in123;
        outs[i+7] = inIn0[i+7] + in123;
      }
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL] = function() {
      this.outs[0][0] = this.inputs[0][0] + this.inputs[1][0] + this.inputs[2][0] + this.inputs[3][0];
    };
    next[C.CONTROL][C.CONTROL][C.CONTROL][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.CONTROL][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];
    next[C.CONTROL][C.SCALAR][C.SCALAR][C.SCALAR] = next[C.CONTROL][C.CONTROL][C.CONTROL][C.CONTROL];

    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("UnaryOpUGen" , UnaryOpUGen );
      unit.register("BinaryOpUGen", BinaryOpUGen);
      unit.register("MulAdd", MulAdd);
      unit.register("Sum3"  , Sum3  );
      unit.register("Sum4"  , Sum4  );
    }
  };

});
