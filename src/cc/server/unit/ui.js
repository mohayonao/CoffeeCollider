define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var unit = require("./unit");
  
  var log001 = Math.log(0.001);
  
  var MouseX = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0] || 0.01;
      var maxval = this.inputs[1][0];
      var warp   = this.inputs[2][0];
      var lag    = this.inputs[3][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? instance.f32_syncItems[C.POS_X] : 0;
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
      }
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };

  var MouseY = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0] || 0.01;
      var maxval = this.inputs[1][0];
      var warp   = this.inputs[2][0];
      var lag    = this.inputs[3][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? instance.f32_syncItems[C.POS_Y] : 0;
      if (warp === 0) {
        y0 = (maxval - minval) * y0 + minval;
      } else {
        y0 = Math.pow(maxval / minval, y0) * minval;
      }
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };

  var MouseButton = function() {
    var ctor = function() {
      this.process = next;
      this._y1  = 0;
      this._b1  = 0;
      this._lag = 0;
      this._mouse = cc.server.syncItems;
      this.process(1);
    };
    var next = function(inNumSamples, instance) {
      var minval = this.inputs[0][0];
      var maxval = this.inputs[1][0];
      var lag    = this.inputs[2][0];
      var y1 = this._y1;
      var b1 = this._b1;
      if (lag !== this._lag) {
        this._b1  = lag === 0 ? 0 : Math.exp(log001 / (lag * this.rate.sampleRate));
        this._lag = lag;
      }
      var y0 = instance ? (instance.syncItems[C.BUTTON] ? maxval : minval) : minval;
      this.outs[0][0] = y1 = y0 + b1 * (y1 - y0);
      this._y1 = y1;
    };
    return ctor;
  };
  
  module.exports = {
    install: function() {
      unit.register("MouseX", MouseX);
      unit.register("MouseY", MouseY);
      unit.register("MouseButton", MouseButton);
    }
  };

});
