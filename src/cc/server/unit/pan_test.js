define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit = require("./unit");
  var pan  = require("./pan");
  
  unitTestSuite.desc = "server/unit/pan.js";
  
  unitTestSuite("Pan2", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"   , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"pos"  , rate:C.AUDIO  , value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
        { name:"level", rate:C.CONTROL, value:unitTestSuite.in0 },
      ],
      outputs: 2
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"   , rate:C.AUDIO  , value:unitTestSuite.freq1 },
        { name:"pos"  , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"level", rate:C.CONTROL, value:unitTestSuite.in0 },
      ],
      outputs: 2
    }
  ]);

  unitTestSuite("XFade2", [
    { rate: C.AUDIO,
      inputs: [
        { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"pos"  , rate:C.AUDIO  , value:unitTestSuite.in2 },
        { name:"level", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate: C.AUDIO,
      inputs: [
        { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"pos"  , rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"level", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    }
  ]);
  
  unitTestSuite("LinXFade2", [
    { rate: C.AUDIO,
      inputs: [
        { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"pos"  , rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate: C.AUDIO,
      inputs: [
        { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"pos"  , rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    }
  ]);

});
