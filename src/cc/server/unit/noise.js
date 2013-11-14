define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.unit.specs.WhiteNoise = (function() {
    var ctor = function() {
      this.process = next;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = Math.random() * 2 - 1;
      }
    };
    return ctor;
  })();
  
  cc.unit.specs.PinkNoise = (function() {
    var ctor = function() {
      this.process = next;
      var whites = new Uint8Array(5);
      for (var i = 0; i < 5; ++i) {
        whites[i] = ((Math.random() * 1073741824)|0) % 25;
      }
      this._whites = whites;
      this._key    = 0;
      this.process(1);
    };
    var MAX_KEY = 31;
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var key = this._key|0, whites = this._whites;
      var last_key, sum, diff, i, j;
      for (i = 0; i < inNumSamples; ++i) {
        last_key = key++;
        if (key > MAX_KEY) {
          key = 0;
        }
        diff = last_key ^ key;
        for (j = sum = 0; j < 5; ++j) {
          if (diff & (1 << j)) {
            whites[j] = ((Math.random() * 1073741824)|0) % 25;
          }
          sum += whites[j];
        }
        out[i] = (sum * 0.01666666) - 1;
      }
      this._key = key;
    };
    return ctor;
  })();

  cc.unit.specs.Dust = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 1 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale : 0;
      }
    };
    return ctor;
  })();

  cc.unit.specs.Dust2 = (function() {
    var ctor = function() {
      this.process  = next;
      this._density = 0;
      this._scale   = 0;
      this._thresh  = 0;
      this.process(1);
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var density = this.inputs[0][0];
      var thresh, scale;
      if (density !== this._density) {
        thresh = this._thresh = density * this.rate.sampleDur;
        scale  = this._scale  = thresh > 0 ? 2 / thresh : 0;
        this._density = density;
      } else {
        thresh = this._thresh;
        scale  = this._scale;
      }
      for (var i = 0; i < inNumSamples; ++i) {
        var z = Math.random();
        out[i] = z < thresh ? z * scale - 1 : 0;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});
