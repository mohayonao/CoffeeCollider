define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  cc.ugen.specs.Osc = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, bufnum, freq, phase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, bufnum, freq, phase]).madd(mul, add);
      }
    },
  };
  
  cc.ugen.specs.SinOsc = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, phase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, phase]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.SinOscFB = {
    $ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, feedback]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, feedback]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.OscN = {
    $ar: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, bufnum, freq, phase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "bufnum=0,freq=440,phase=0,mul=1,add=0",
      ctor: function(bufnum, freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, bufnum, freq, phase]).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.FSinOsc = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, phase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, phase]).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.LFSaw = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, iphase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, iphase]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.LFPar = cc.ugen.specs.LFSaw;
  cc.ugen.specs.LFCub = cc.ugen.specs.LFSaw;
  cc.ugen.specs.LFTri = cc.ugen.specs.LFSaw;

  cc.ugen.specs.LFPulse = {
    $ar: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, iphase, width]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, iphase, width]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Blip = {
    $ar: {
      defaults: "freq=440,numharm=200,mul=1,add=0",
      ctor: function(freq, numharm, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, numharm]).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Saw = {
    $ar: {
      defaults: "freq=440,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq]).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Pulse = {
    $ar: {
      defaults: "freq=440,width=0.5,mul=1,add=0",
      ctor: function(freq, width, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, width]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Impulse = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, freq, phase]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, freq, phase]).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.SyncSaw = {
    $ar: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return cc.ugen.multiNewList(this, [C.AUDIO, syncFreq, sawFreq]).madd(mul, add);
      }
    },
    $kr: {
      defaults: "syncFreq=440,sawFreq=440,mul=1,add=0",
      ctor: function(syncFreq, sawFreq, mul, add) {
        return cc.ugen.multiNewList(this, [C.CONTROL, syncFreq, sawFreq]).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Select = {
    // TODO: checkInputs
    $ar: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return cc.ugen.multiNewList(this, [C.AUDIO, which].concat(array));
      }
    },
    $kr: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        return cc.ugen.multiNewList(this, [C.CONTROL, which].concat(array));
      }
    },
  };
  
  cc.ugen.specs.DC = {
    $ir: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.SCALAR, _in]);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]);
      }
    },
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]);
      }
    }
  };
  
  cc.ugen.specs.Silent = {
    $ir: {
      ctor: function() {
        return cc.global.DC.ir(0);
      }
    },
    $kr: {
      ctor: function() {
        return cc.global.DC.kr(0);
      }
    },
    $ar: {
      ctor: function() {
        return cc.global.DC.ar(0);
      }
    }
  };
  
  module.exports = {};

});
