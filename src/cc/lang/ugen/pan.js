define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var pan2_ctor = function(rate) {
    return function(_in, pos, level) {
      this.init.call(this, rate, _in, pos, level);
      this.channels = [
        cc.createOutputProxy(this.rate, this, 0),
        cc.createOutputProxy(this.rate, this, 1),
      ];
      this.numOfOutputs = 2;
      return this.channels;
    };
  };
  
  cc.ugen.specs.Pan2 = {
    Klass: cc.MultiOutUGen,
    checkInputs: cc.ugen.checkNInputs(1),
    $ar: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.AUDIO)
    },
    $kr: {
      defaults: "in=0,pos=0,level=1",
      ctor: pan2_ctor(C.CONTROL),
    }
  };

  cc.ugen.specs.XFade2 = {
    checkInputs: cc.ugen.checkNInputs(2),
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.init(C.AUDIO, inA, inB, pan, level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.init(C.CONTROL, inA, inB, pan, level);
      }
    }
  };

  cc.ugen.specs.LinXFade2 = {
    checkInputs: cc.ugen.checkNInputs(2),
    $ar: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.init(C.AUDIO, inA, inB, pan).__mul__(level);
      }
    },
    $kr: {
      defaults: "inA=0,inB=0,pan=0,level=1",
      ctor: function(inA, inB, pan, level) {
        return this.init(C.CONTROL, inA, inB, pan).__mul__(level);
      }
    }
  };
  
  module.exports = {};

});
