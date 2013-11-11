define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("./utils");
  var nanToZero   = utils.nanToZero;
  var zapgremlins = utils.zapgremlins;
  
  cc.unit.specs.RLPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C - next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 + 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 + 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 + 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      nanToZero(out);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C - b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 + 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      if (isNaN(out[0])) {
        out[0] = 0;
      }
    };
    return ctor;
  })();

  cc.unit.specs.RHPF = (function() {
    var ctor = function() {
      if (this.bufLength === 1) {
        this.process = next_1;
      } else {
        this.process = next;
      }
      this._a0 = 0;
      this._b1 = 0;
      this._b2 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._freq  = undefined;
      this._reson = undefined;
      next_1.call(this, 1);
    };
    var next = function() {
      var out = this.outputs[0];
      var inIn  = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      var i, imax, j = 0;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        var next_b1 = (1.0 + C) * cosf;
        var next_b2 = -C;
        var next_a0 = (1.0 + C + next_b1) * 0.25;
        var a0_slope = (next_a0 - a0) * this.rate.filterSlope;
        var b1_slope = (next_b1 - b1) * this.rate.filterSlope;
        var b2_slope = (next_b2 - b2) * this.rate.filterSlope;
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
          a0 += a0_slope;
          b1 += b1_slope;
          b2 += b2_slope;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
        this._freq = freq;
        this._reson = reson;
        this._a0 = next_a0;
        this._b1 = next_b1;
        this._b2 = next_b2;
      } else {
        for (i = 0, imax = this.rate.filterLoops; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = a0 * inIn[j] + b1 * y0 + b2 * y1;
          out[j++] = y2 - 2.0 * y0 + y1;
          y1 = a0 * inIn[j] + b1 * y2 + b2 * y0;
          out[j++] = y1 - 2.0 * y2 + y0;
        }
        for (i = 0, imax = this.rate.filterRemain; i < imax; ++i) {
          y0 = a0 * inIn[j] + b1 * y1 + b2 * y2;
          out[j++] = y0 - 2.0 * y1 + y2;
          y2 = y1; y1 = y0;
        }
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      nanToZero(out);
    };
    var next_1 = function() {
      var out = this.outputs[0];
      var inIn = this.inputs[0];
      var freq  = this.inputs[1][0];
      var reson = this.inputs[2][0];
      var y0;
      var y1 = this._y1;
      var y2 = this._y2;
      var a0 = this._a0;
      var b1 = this._b1;
      var b2 = this._b2;
      if (freq !== this._freq || reson !== this._reson) {
        var qres = Math.max(0.001, reson);
        var pfreq = freq * this.rate.radiansPerSample;
        var D = Math.tan(pfreq * qres * 0.5);
        var C = ((1.0-D)/(1.0+D));
        var cosf = Math.cos(pfreq);
        b1 = (1.0 + C) * cosf;
        b2 = -C;
        a0 = (1.0 + C + b1) * 0.25;
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
        this._freq = freq;
        this._reson = reson;
        this._a0 = a0;
        this._b1 = b1;
        this._b2 = b2;
      } else {
        y0 = a0 * inIn[0] + b1 * y1 + b2 * y2;
        out[0] = y0 - 2.0 * y1 + y2;
        y2 = y1; y1 = y0;
      }
      this._y1 = zapgremlins(y1);
      this._y2 = zapgremlins(y2);
      if (isNaN(out[0])) {
        out[0] = 0;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
