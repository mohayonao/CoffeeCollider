define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.ugen.specs.PlayBuf = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        this.init(C.AUDIO, bufnum, rate, trigger, startPos, loop, doneAction);
        return this.initOutputs(numChannels, this.rate);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum,rate=1,trigger=1,startPos=0,loop=0,doneAction=0",
      ctor: function(numChannels, bufnum, rate, trigger, startPos, loop, doneAction) {
        if (typeof numChannels !== "number") {
          throw new TypeError("PlayBuf: numChannels should be an integer.");
        }
        this.init(C.AUDIO, bufnum, rate, trigger, startPos, loop, doneAction);
        return this.initOutputs(numChannels, this.rate);
      }
    }
  };

  cc.ugen.specs.BufRd = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        if (phase.rate !== C.AUDIO) {
          throw new Error("BufRd: phase input is not audio rate.");
        }
        this.init(C.AUDIO, bufnum, phase, loop, interpolation);
        return this.initOutputs(numChannels, this.rate);
      }
    },
    $kr: {
      defaults: "numChannels=0,bufnum=0,phase=0,loop=1,interpolation=2",
      ctor: function(numChannels, bufnum, phase, loop, interpolation) {
        this.init(C.CONTROL, bufnum, phase, loop, interpolation);
        return this.initOutputs(numChannels, this.rate);
      }
    }
  };

  cc.ugen.specs.BufSampleRate = {
    $kr: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.init(C.CONTROL, bufnum);
      }
    },
    $ir: {
      defaults: "bufnum=0",
      ctor: function(bufnum) {
        return this.init(C.CONTROL, bufnum); // TODO: SCALAR rate
      }
    }
  };
  
  cc.ugen.specs.BufRateScale = cc.ugen.specs.BufSampleRate;
  cc.ugen.specs.BufFrames    = cc.ugen.specs.BufSampleRate;
  cc.ugen.specs.BufSamples   = cc.ugen.specs.BufSampleRate;
  cc.ugen.specs.BufDur       = cc.ugen.specs.BufSampleRate;
  cc.ugen.specs.BufChannels  = cc.ugen.specs.BufSampleRate;
  
  module.exports = {};

});
