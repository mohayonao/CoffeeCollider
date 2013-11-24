define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  var kEnvGen_gate        = 0;
  var kEnvGen_levelScale  = 1;
  var kEnvGen_levelBias   = 2;
  var kEnvGen_timeScale   = 3;
  var kEnvGen_doneAction  = 4;
  var kEnvGen_initLevel   = 5;
  var kEnvGen_numStages   = 6;
  var kEnvGen_releaseNode = 7;
  var kEnvGen_loopNode    = 8;
  var kEnvGen_nodeOffset  = 9;
  var shape_Step          = 0;
  var shape_Linear        = 1;
  var shape_Exponential   = 2;
  var shape_Sine          = 3;
  var shape_Welch         = 4;
  var shape_Curve         = 5;
  var shape_Squared       = 6;
  var shape_Cubed         = 7;
  var shape_Sustain       = 9999;
  
  
  cc.unit.specs.EnvGen = (function() {
    var ctor = function() {
      this.process = next_k;
      this._level    = this.inputs[kEnvGen_initLevel][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0];
      this._endLevel = this._level;
      this._counter  = 0;
      this._stage    = 1000000000;
      this._prevGate = 0;
      this._released = false;
      this._releaseNode = this.inputs[kEnvGen_releaseNode][0]|0;
      this._a1 = 0;
      this._a2 = 0;
      this._b1 = 0;
      this._y1 = 0;
      this._y2 = 0;
      this._grow  = 0;
      this._shape = 0;
      next_k.call(this, 1);
    };
    var next_k = function() {
      var out = this.outputs[0];
      var gate = this.inputs[kEnvGen_gate][0];
      var counter  = this._counter;
      var level    = this._level;
      var prevGate = this._prevGate;
      var numstages, doneAction, loopNode;
      var envPtr, stageOffset, endLevel, dur, shape, curve;
      var w, a1, a2, b1, y0, y1, y2;
      
      var checkGate = true, counterOffset = 0;
      if (prevGate <= 0 && gate > 0) {
        this._stage = -1;
        this._released = false;
        this.done = false;
        counter   = counterOffset;
        checkGate = false;
      } else if (gate <= -1 && prevGate > -1 && !this._released) {
        numstages = this.inputs[kEnvGen_numStages][0]|0;
        dur = -gate - 1;
        counter = Math.max(1, (dur * this.rate.sampleRate)|0) + counterOffset;
        this._stage = numstages;
        this._shape = shape_Linear;
        this._endLevel = this.inputs[this.numOfInputs - 4][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0];
        this._grow     = (this._endLevel - level) / counter;
        this._released = true;
        checkGate = true;
      } else if (prevGate > 0 && gate <= 0 && this._releaseNode >= 0 && !this._released) {
        counter = counterOffset;
        this._stage = this._releaseNode - 1;
        this._released = true;
        checkGate = false;
      }
      this._prevGate = gate;
      
      var initSegment = false;
      if (counter <= 0) {
        numstages = this.inputs[kEnvGen_numStages][0]|0;
        if (this._stage + 1 >= numstages) {
          counter = Infinity;
          this._shape = 0;
          level = this._endLevel;
          this.done = true;
          doneAction = this.inputs[kEnvGen_doneAction][0]|0;
          this.doneAction(doneAction);
        } else if (this._stage + 1 === this._releaseNode && !this._released) { // sustain stage
          loopNode = this.inputs[kEnvGen_loopNode][0]|0;
          if (loopNode >= 0 && loopNode < numstages) {
            this._stage = loopNode;
            initSegment = true;
          } else {
            counter = Infinity;
            this._shape = shape_Sustain;
            level = this._endLevel;
          }
        } else {
          this._stage += 1;
          initSegment = true;
        }
      }

      if (initSegment) {
        stageOffset = (this._stage << 2) + kEnvGen_nodeOffset;
        if (stageOffset + 4 > this.numOfInputs) {
          // oops;
          return;
        }
        
        envPtr = this.inputs;
        endLevel = envPtr[0+stageOffset][0] * this.inputs[kEnvGen_levelScale][0] + this.inputs[kEnvGen_levelBias][0]; // scale levels
        dur      = envPtr[1+stageOffset][0] * this.inputs[kEnvGen_timeScale ][0];
        shape    = envPtr[2+stageOffset][0]|0;
        curve    = envPtr[3+stageOffset][0];
        this._endLevel = endLevel;
        this._shape    = shape;
        
        counter = Math.max(1, (dur * this.rate.sampleRate)|0);
        if (counter === 1) {
          this._shape = shape_Linear;
        }
        switch (this._shape) {
        case shape_Step:
          level = endLevel;
          break;
        case shape_Linear:
          this._grow = (endLevel - level) / counter;
          break;
        case shape_Exponential:
          this._grow = Math.pow(endLevel / level, 1 / counter);
          break;
        case shape_Sine:
          w = Math.PI / counter;
          this._a2 = (endLevel + level) * 0.5;
          this._b1 = 2 * Math.cos(w);
          this._y1 = (endLevel - level) * 0.5;
          this._y2 = this._y1 * Math.sin(Math.PI * 0.5 - w);
          level = this._a2 - this._y1;
          break;
        case shape_Welch:
          w = (Math.PI * 0.5) / counter;
          this._b1 = 2 * Math.cos(w);
          if (endLevel >= level) {
            this._a2 = level;
            this._y1 = 0;
            this._y2 = -Math.sin(w) * (endLevel - level);
          } else {
            this._a2 = endLevel;
            this._y1 = level - endLevel;
            this._y2 = Math.cos(w) * (level - endLevel);
          }
          level = this._a2 + this._y1;
          break;
        case shape_Curve:
          if (Math.abs(curve) < 0.001) {
            this._shape = 1; // shape_Linear
            this._grow = (endLevel - level) / counter;
          } else {
            a1 = (endLevel - level) / (1.0 - Math.exp(curve));
            this._a2 = level + a1;
            this._b1 = a1;
            this._grow = Math.exp(curve / counter);
          }
          break;
        case shape_Squared:
          this._y1 = Math.sqrt(level);
          this._y2 = Math.sqrt(endLevel);
          this._grow = (this._y2 - this._y1) / counter;
          break;
        case shape_Cubed:
          this._y1 = Math.pow(level   , 0.33333333);
          this._y2 = Math.pow(endLevel, 0.33333333);
          this._grow = (this._y2 - this._y1) / counter;
          break;
        }
      }

      a2 = this._a2;
      b1 = this._b1;
      y1 = this._y1;
      y2 = this._y2;
      
      switch (this._shape) {
      case shape_Step:
        break;
      case shape_Linear:
        level += this._grow;
        break;
      case shape_Exponential:
        level *= this._grow;
        break;
      case shape_Sine:
        y0 = b1 * y1 - y2;
        level = a2 - y0;
        y2 = y1;
        y1 = y0;
        break;
      case shape_Welch:
        y0 = b1 * y1 - y2;
        level = a2 + y0;
        y2 = y1;
        y1 = y0;
        break;
      case shape_Curve:
        b1 *= this._grow;
        level = a2 - b1;
        break;
      case shape_Squared:
        y1 += this._grow;
        level = y1 * y1;
        break;
      case shape_Cubed:
        y1 += this._grow;
        level = y1 * y1 * y1;
        break;
      case shape_Sustain:
        break;
      }
      out[0] = level;
      this._level   = level;
      this._counter = counter - 1;
      this._a2 = a2;
      this._b1 = b1;
      this._y1 = y1;
      this._y2 = y2;
    };
    return ctor;
  })();
  
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
