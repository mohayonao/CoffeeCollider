define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.unit.specs.Line = (function() {
    var ctor = function() {
      this.process = next_kkk;
      var start = this.inputs[0][0];
      var end = this.inputs[1][0];
      var dur = this.inputs[2][0];
      var counter = Math.round(dur * this.rate.sampleRate);
      this._counter = Math.max(1, counter);
      if (counter === 0) {
        this._level = end;
        this._slope = 0;
      } else {
        this._slope = (end - start) / this._counter;
        this._level = start + this._slope;
      }
      this._endLevel = end;
      this._doneAction = this.inputs[3][0];
      this.outputs[0][0] = this._level;
    };
    var next_kkk = function(inNumSamples) {
      var out = this.outputs[0];
      var level   = this._level;
      var counter = this._counter;
      var slope   = this._slope;
      var i, remain = inNumSamples;
      do {
        var nsmps;
        if (counter === 0) {
          nsmps  = remain;
          remain = 0;
          var endLevel = this._endLevel;
          for (i = 0; i < nsmps; ++i) {
            out[i] = endLevel;
          }
        } else {
          nsmps = Math.min(remain, counter);
          counter -= nsmps;
          remain  -= nsmps;
          for (i = 0; i < nsmps; ++i) {
            out[i] = level;
            level += slope;
          }
          if (counter === 0) {
            this.doneAction(this._doneAction);
          }
        }
      } while (remain);
      this._counter = counter;
      this._level   = level;
    };
    
    return ctor;
  })();
  
  module.exports = {};

});
