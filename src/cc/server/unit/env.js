define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  cc.unit.specs.Linen = (function() {
    var ctor = function() {
      this.process = next;
      this._level  = 0;
      this._stage  = 4;
      this._prevGate = 0;
      this._slope    = 0;
      this._counter  = 0;
      next.call(this, 1);
    };
    var next = function() {
      var out  = this.outputs[0];
      var gate = this.inputs[0][0];
      var attackTime, susLevel, releaseTime;
      var counter;
      
      if (this._prevGate <= 0 && gate > 0) {
        this.done = false;
        this._stage = 0;
        attackTime = this.inputs[1][0];
        susLevel   = this.inputs[2][0];
        counter = Math.max(1, (attackTime * this.rate.sampleRate)|0);
        this._slope = (susLevel - this._level) / counter;
        this._counter = counter;
      }
      switch (this._stage) {
      case 0:
      case 2:
        out[0] = this._level;
        this._level += this._slope;
        if (--this._counter === 0) {
          this._stage++;
        }
        break;
      case 1:
        out[0] = this._level;
        if (gate <= -1) {
          this._stage = 2;
          releaseTime = -gate - 1;
          counter = Math.max(1, (releaseTime * this.rate.sampleRate)|0);
          this._slope = (-this._level) / counter;
          this._counter = counter;
        } else if (gate <= 0) {
          this._stage = 2;
          releaseTime = this.inputs[3][0];
          counter = Math.max(1, (releaseTime * this.rate.sampleRate)|0);
          this._slope = (-this._level) / counter;
          this._counter = counter;
        }
        break;
      case 3:
        out[0] = 0;
        this._done = true;
        this._stage++;
        this.doneAction(this.inputs[4][0]);
        break;
      case 4:
        out[0] = 0;
        break;
      }
      this._prevGate = gate;
    };
    return ctor;
  })();
  
  module.exports = {};

});
