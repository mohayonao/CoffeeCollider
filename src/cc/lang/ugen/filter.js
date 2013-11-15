define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");

  cc.ugen.specs.OnePole = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.AUDIO, _in, coef).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,coef=0.5,mul=1,add=0",
      ctor: function(_in, coef, mul, add) {
        return this.init(C.CONTROL, _in, coef).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.OneZero = cc.ugen.specs.OnePole;

  cc.ugen.specs.TwoPole = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.init(C.AUDIO, _in, freq, radius).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,radius=0.8,mul=1,add=0",
      ctor: function(_in, freq, radius, mul, add) {
        return this.init(C.CONTROL, _in, freq, radius).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.TwoZero = cc.ugen.specs.TwoPole;
  cc.ugen.specs.APF     = cc.ugen.specs.TwoPole;
  
  cc.ugen.specs.LPF = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.init(C.AUDIO, _in, freq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,mul=1,add=0",
      ctor: function(_in, freq, mul, add) {
        return this.init(C.CONTROL, _in, freq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.HPF = cc.ugen.specs.LPF;

  cc.ugen.specs.BPF = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.BRF = cc.ugen.specs.BPF;
  
  cc.ugen.specs.RLPF = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;

  cc.ugen.specs.Lag = {
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.init(C.AUDIO, _in, lagTime).madd(mul, add);
      }
    },
    kr: {
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
    _checkInputs: cc.ugen.checkSameRateAsFirstInput,
    ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.AUDIO, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.CONTROL, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;
  
  module.exports = {};

});
