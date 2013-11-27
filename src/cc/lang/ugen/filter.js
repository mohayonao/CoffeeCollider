define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Resonz = {
    $ar: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, bwr]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, bwr]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.OnePole = {
    $ar: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, coef]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, coef]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.OneZero = cc.ugen.specs.OnePole;

  cc.ugen.specs.TwoPole = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, radius]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, radius]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.TwoZero = cc.ugen.specs.TwoPole;
  
  cc.ugen.specs.APF = {
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, radius]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, radius]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.LPF = {
    $ar: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.HPF = cc.ugen.specs.LPF;
  
  cc.ugen.specs.BPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, rq]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, rq]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.BRF = cc.ugen.specs.BPF;
  
  cc.ugen.specs.RLPF = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, rq]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, rq]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;
  
  cc.ugen.specs.MidEQ = {
    $ar: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, freq, rq, db]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, freq, rq, db]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.LPZ1 = {
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
  };
  cc.ugen.specs.HPZ1  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.Slope = cc.ugen.specs.LPZ1;
  cc.ugen.specs.LPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.HPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.BPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.BRZ2  = cc.ugen.specs.LPZ1;
  
  cc.ugen.specs.Changed = {
    $ar: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.ar(_in).abs().gt(threshold);
      }
    },
    $kr: {
      defaults: "in=0,threshold=0",
      ctor: function(_in, threshold) {
        return cc.global.HPZ1.kr(_in).abs().gt(threshold);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.Lag = {
    $ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, lagTime]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, lagTime]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.Lag2 = cc.ugen.specs.Lag;
  cc.ugen.specs.Lag3 = cc.ugen.specs.Lag;
  cc.ugen.specs.Ramp = cc.ugen.specs.Lag;

  cc.ugen.specs.LagUD = {
    $ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, lagTimeU, lagTimeD]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, lagTimeU, lagTimeD]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;

  cc.ugen.specs.VarLag = {
    $ar: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, time, curvature, warp, start]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, time, curvature, warp, start]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  cc.ugen.specs.Slew = {
    $ar: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in, up, dn]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in, up, dn]).madd(mul, add);
      }
    },
    checkInputs: cc.ugen.checkSameRateAsFirstInput
  };
  
  module.exports = {};

});
