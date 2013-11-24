define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");

  cc.ugen.specs.FSinOsc = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.SinOsc = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.SinOscFB = {
    $ar: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(C.AUDIO, freq, feedback).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,feedback=0,mul=1,add=0",
      ctor: function(freq, feedback, mul, add) {
        return this.init(C.CONTROL, freq, feedback).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.LFSaw = {
    $ar: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(C.AUDIO, freq, iphase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,mul=1,add=0",
      ctor: function(freq, iphase, mul, add) {
        return this.init(C.CONTROL, freq, iphase).madd(mul, add);
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
        return this.init(C.AUDIO, freq, iphase, width).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,iphase=0,width=0.5,mul=1,add=0",
      ctor: function(freq, iphase, width, mul, add) {
        return this.init(C.CONTROL, freq, iphase, width).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Blip = {
    $ar: {
      defaults: "freq=440,numharm=200,mul=1,add=0",
      ctor: function(freq, numharm, mul, add) {
        return this.init(C.AUDIO, freq, numharm).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Saw = {
    $ar: {
      defaults: "freq=440,mul=1,add=0",
      ctor: function(freq, mul, add) {
        return this.init(C.AUDIO, freq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Pulse = {
    $ar: {
      defaults: "freq=440,width=0.5,mul=1,add=0",
      ctor: function(freq, width, mul, add) {
        return this.init(C.AUDIO, freq, width).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Impulse = {
    $ar: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.AUDIO, freq, phase).madd(mul, add);
      }
    },
    $kr: {
      defaults: "freq=440,phase=0,mul=1,add=0",
      ctor: function(freq, phase, mul, add) {
        return this.init(C.CONTROL, freq, phase).madd(mul, add);
      }
    }
  };

  cc.ugen.specs.Select = {
    multiCall: 1,
    $ar: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        if (!Array.isArray(array)) {
          array = [ array ];
        }
        return this.init.apply(this, [C.AUDIO, which].concat(array));
      }
    },
    $kr: {
      defaults: "which=0,array=[]",
      ctor: function(which, array) {
        if (!Array.isArray(array)) {
          array = [ array ];
        }
        return this.init.apply(this, [C.CONTROL, which].concat(array));
      }
    },
  };
  
  cc.ugen.specs.DC = {
    $ir: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.SCALAR, _in);
      }
    },
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.CONTROL, _in);
      }
    },
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return this.init(C.AUDIO, _in);
      }
    }
  };
  
  module.exports = {};

});
