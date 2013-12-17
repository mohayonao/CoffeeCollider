define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  cc.ugen.specs.Line = {
    $ar: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(C.AUDIO, start, end, dur, doneAction).madd(mul, add);
      }
    },
    $kr: {
      defaults: "start=0,end=1,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(C.CONTROL, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.Line = (function() {
    var ctor = function() {
      this.process = next;
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
    var next = function(inNumSamples) {
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
  
  cc.ugen.specs.XLine = {
    $ar: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(C.AUDIO, start, end, dur, doneAction).madd(mul, add);
      }
    },
    $kr: {
      defaults: "start=1,end=2,dur=1,mul=1,add=0,doneAction=0",
      ctor: function(start, end, dur, mul, add, doneAction) {
        return this.multiNew(C.CONTROL, start, end, dur, doneAction).madd(mul, add);
      }
    }
  };
  
  cc.unit.specs.XLine = (function() {
    var ctor = function() {
      this.process = next;
      var start = this.inputs[0][0] || 0.001;
      var end   = this.inputs[1][0] || 0.001;
      var dur   = this.inputs[2][0];
      var counter = Math.round(dur * this.rate.sampleRate);
      if (counter === 0) {
        this._level   = end;
        this._counter = 0;
        this._growth  = 0;
      } else {
        this._counter = counter;
        this._growth = Math.pow(end / start, 1 / counter);
        this._level  = start * this._growth;
      }
      this._endLevel = end;
      this._doneAction = this.inputs[3][0];
      this.outputs[0][0] = this._level;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var level   = this._level;
      var counter = this._counter;
      var growth  = this._growth;
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
            level *= growth;
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
