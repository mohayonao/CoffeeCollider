define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit  = require("./unit");
  var filter = require("./filter");

  unitTestSuite.desc = "server/unit/filter.js";

  unitTestSuite(["OnePole", "OneZero"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"coef", rate:C.CONTROL, value:[ 1, 0.5, 0.5, 0, -0, -0.5, -0.5, -1 ] },
      ]
    }
  ]);
  
  unitTestSuite(["TwoPole", "TwoZero", "APF"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"    , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"freq"  , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"radius", rate:C.CONTROL, value:[ 1, 0.5, 0.5, 0, -0, -0.5, -0.5, -1 ] },
      ]
    }
  ]);

  unitTestSuite(["LPF", "HPF"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"freq", rate:C.AUDIO, value:unitTestSuite.freq1 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"freq", rate:C.CONTROL, value:[0, 0, 25, 25, 50, 100] },
      ]
    }
  ]);

  unitTestSuite(["BPF", "BRF"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"freq", rate:C.AUDIO, value:unitTestSuite.freq0 },
        { name:"rq"  , rate:C.AUDIO, value:[ 0, 0.5, 0.5, 1, 2 ] },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"freq", rate:C.CONTROL, value:[0, 0, 25, 25, 50, 100] },
        { name:"rq"  , rate:C.CONTROL, value:[ 0, 0.5, 0.5, 1, 2 ] },
      ]
    }
  ]);

  unitTestSuite(["RLPF", "RHPF"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"freq", rate:C.AUDIO, value:unitTestSuite.freq0 },
        { name:"rq"  , rate:C.AUDIO, value:[ 0, 0.5, 0.5, 1, 2 ] },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"freq", rate:C.CONTROL, value:unitTestSuite.freq0 },
        { name:"rq"  , rate:C.CONTROL, value:[ 0, 0.5, 0.5, 1, 2 ] },
      ]
    }
  ]);

  unitTestSuite(["Lag", "Lag2", "Lag3", "Ramp"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"     , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"lagTime", rate:C.AUDIO, value:unitTestSuite.time1 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"     , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"lagTime", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in"     , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"lagTime", rate:C.SCALAR , value:0.5 },
      ]
    }
  ]);

  unitTestSuite(["LagUD", "Lag2UD", "Lag3UD"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"      , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"lagTimeU", rate:C.CONTROL, value:unitTestSuite.time1 },
        { name:"lagTimeD", rate:C.CONTROL, value:unitTestSuite.time1 },
      ]
    }
  ]);

  unitTestSuite("Slew", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"up", rate:C.CONTROL, value:[+1, +0.5, 0, -0.5, -1] },
        { name:"dn", rate:C.CONTROL, value:[-1, -0.5, 0, +0.5, +1] },
      ]
    }
  ]);

});
