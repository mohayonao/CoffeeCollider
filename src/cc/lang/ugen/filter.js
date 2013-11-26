define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.Resonz = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.init(C.AUDIO, _in, freq, bwr).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,bwr=1,mul=1,add=0",
      ctor: function(_in, freq, bwr, mul, add) {
        return this.init(C.CONTROL, _in, freq, bwr).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.OnePole = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.AUDIO, _in, coef).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.CONTROL, _in, coef).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.OneZero = cc.ugen.specs.OnePole;

  cc.ugen.specs.TwoPole = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.init(C.AUDIO, _in, freq, radius).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.init(C.CONTROL, _in, freq, radius).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.TwoZero = cc.ugen.specs.TwoPole;
  cc.ugen.specs.APF     = cc.ugen.specs.TwoPole;
  
  cc.ugen.specs.LPF = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.init(C.AUDIO, _in, freq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.init(C.CONTROL, _in, freq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.HPF = cc.ugen.specs.LPF;

  cc.ugen.specs.BPF = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.BRF = cc.ugen.specs.BPF;
  
  cc.ugen.specs.RLPF = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;

  cc.ugen.specs.MidEQ = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq, db).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,freq=440,rq=1,db=0,mul=1,add=0",
      ctor: function(_in, freq, rq, db, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq, db).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.LPZ1 = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.init(C.AUDIO, _in, mul, add);
      }
    },
    $kr: {
      defaults: "in=0,mul=1,add=0",
      ctor: function(_in, mul, add) {
        return this.init(C.CONTROL, _in, mul, add);
      }
    }
  };
  
  cc.ugen.specs.HPZ1  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.Slope = cc.ugen.specs.LPZ1;
  cc.ugen.specs.LPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.HPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.BPZ2  = cc.ugen.specs.LPZ1;
  cc.ugen.specs.BRZ2  = cc.ugen.specs.LPZ1;
  
  cc.ugen.specs.Changed = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
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
    }
  };
  
  cc.ugen.specs.Lag = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.init(C.AUDIO, _in, lagTime).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.init(C.CONTROL, _in, lagTime).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Lag2 = cc.ugen.specs.Lag;
  cc.ugen.specs.Lag3 = cc.ugen.specs.Lag;
  cc.ugen.specs.Ramp = cc.ugen.specs.Lag;

  cc.ugen.specs.LagUD = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.AUDIO, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.CONTROL, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;

  cc.ugen.specs.VarLag = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.init(C.AUDIO, _in, time, curvature, warp, start).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,time=0.1,curvature=0,warp=5,start=0,mul=1,add=0",
      ctor: function(_in, time, curvature, warp, start, mul, add) {
        return this.init(C.CONTROL, _in, time, curvature, warp, start).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Slew = {
    checkInputs: cc.ugen.checkSameRateAsFirstInput,
    $ar: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.init(C.AUDIO, _in, up, dn).madd(mul, add);
      }
    },
    $kr: {
      defaults: "in=0,up=1,dn=1,mul=1,add=0",
      ctor: function(_in, up, dn, mul, add) {
        return this.init(C.CONTROL, _in, up, dn).madd(mul, add);
      }
    },
  };
  
  module.exports = {};

});
