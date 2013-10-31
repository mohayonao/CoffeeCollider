define(function(require, exports, module) {
  "use strict";

  var unit = require("./unit");
  
  unit.specs.MulAdd = (function() {
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
  })();

  unit.specs.Sum3 = (function() {
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
  })();
  
  unit.specs.Sum4 = (function() {
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
  })();
  
  module.exports = {};

});
