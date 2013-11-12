define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.Integrator = (function() {
    var ctor = function() {
      if (this.inRates[1] === C.SCALAR) {
        this.process = next_i;
      } else {
        this.process = next;
      }
      this._b1 = this.inputs[1][0];
      this._y1 = 0;
      next.call(this, 1);
    };
    var next_i = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1 = this._b1;
      var y1 = this._y1;
      var i;
      if (b1 === 1) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = inIn[i] + y1;
        }
      } else if (b1 === 0) {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = inIn[i];
        }
      } else {
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = inIn[i] + b1 * y1;
        }
      }
      this._y1 = y1;
    };
    var next = function(inNumSamples) {
      var out  = this.outputs[0];
      var inIn = this.inputs[0];
      var b1 = this.inputs[1][0];
      var y1 = this._y1;
      var i;
      if (this._b1 === b1) {
        if (b1 === 1) {
          for (i = 0; i < inNumSamples; ++i) {
            out[i] = y1 = inIn[i] + y1;
          }
        } else if (b1 === 0) {
          for (i = 0; i < inNumSamples; ++i) {
            out[i] = y1 = inIn[i];
          }
        } else {
          for (i = 0; i < inNumSamples; ++i) {
            out[i] = y1 = inIn[i] + b1 * y1;
          }
        }
      } else {
        var b1_slope = (b1 - this._b1) * this.rate.slopeFactor;
        for (i = 0; i < inNumSamples; ++i) {
          out[i] = y1 = inIn[i] + b1 * y1;
          b1 += b1_slope;
        }
        this._b1 = b1;
      }
      this._y1 = y1;
    };
    return ctor;
  })();
  
  module.exports = {};

});
