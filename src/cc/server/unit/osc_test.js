define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./suite_of_test");
  var osc = require("./osc");
  
  unitTestSuite.desc = "server/unit/osc.js";

  unitTestSuite("FSinOsc", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    }
  ]);
  
  unitTestSuite("SinOsc", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.AUDIO, value:[ 0, 0, 0.5, 0.5 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.AUDIO  , value:[ 0, 0, 0.5, 0.5 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.CONTROL, value:[ 0, 0, 0.5, 0.5 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.CONTROL, value:[ 0, 0, 0.5, 0.5 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"phase", rate:C.SCALAR, value:0.5 },
      ]
    }
  ]);

  unitTestSuite("SinOscFB", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"    , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"feedback", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    }
  ]);

  unitTestSuite("LFSaw", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR , value:0.5 },
      ]
    }
  ]);

  unitTestSuite("LFPar", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    }
  ]);
  
  unitTestSuite("LFCub", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR , value:0.5 },
      ]
    }
  ]);
  
  unitTestSuite("LFTri", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR , value:0.5 },
      ]
    }
  ]);
  
  unitTestSuite("LFPulse", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR , value:0.5 },
        { name:"width" , rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"iphase", rate:C.SCALAR , value:0.5 },
        { name:"width" , rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
      ]
    }
  ]);
  
  unitTestSuite("Blip", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq"   , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"numharm", rate:C.CONTROL, value:[ -10, 0, 10, 220, 10000 ] },
      ]
    }
  ]);
  
  unitTestSuite("Saw", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq", rate:C.AUDIO, value:unitTestSuite.freq1 },
      ]
    }
  ]);

  unitTestSuite("Pulse", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"width", rate:C.CONTROL, value:[ 0, 0.5, 1 ]}
      ]
    }
  ]);
  
  unitTestSuite("Impulse", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.AUDIO, value:[ 0, 0.5, 1 ]}
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.AUDIO , value:unitTestSuite.freq1 },
        { name:"phase", rate:C.SCALAR, value:0}
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.CONTROL, value:[ 0, 0.5, 1 ]}
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
        { name:"phase", rate:C.SCALAR , value:0}
      ]
    }
  ]);

});
