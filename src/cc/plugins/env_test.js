define(function(require, exports, module) {
  "use strict";

  var unitTestSuite = require("../../testTools").unitTestSuite;
  var unit = require("../server/unit");
  var env = require("./env");

  unitTestSuite.desc = "plugins/env.js";
  
  unitTestSuite("EnvGen", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"gate", rate:C.CONTROL, value:
          [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
          ]
        },
        { name:"levelScale" , value:1 },
        { name:"levelBias"  , value:0 },
        { name:"timeScale"  , value:1 },
        { name:"doneAction" , value:0 },
        { name:"initLevel"  , value:0 },
        { name:"numstages"  , value:9 },
        { name:"releaseNode", value:-99 },
        { name:"loopNode"   , value:-99 },
        0, 0.01, 0, 0.0,
        1, 0.01, 1, 0.0,
        0, 0.01, 2, 0.0,
        1, 0.01, 3, 0.0,
        0, 0.01, 4, 0.0,
        1, 0.01, 5, 2.0,
        0, 0.01, 6, 0.0,
        1, 0.01, 7, 0.0,
        0, 0.00, 0, 0.0,
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"gate", rate:C.CONTROL, value:
          [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
          ]
        },
        { name:"levelScale" , value:1 },
        { name:"levelBias"  , value:0 },
        { name:"timeScale"  , value:1 },
        { name:"doneAction" , value:2 },
        { name:"initLevel"  , value:1 },
        { name:"numstages"  , value:9 },
        { name:"releaseNode", value:6 },
        { name:"loopNode"   , rate:C.CONTROL, value:[5, 5, 5, 10, 10, 10, 10] },
        1, 0.01, 0, 0.0,
        0, 0.01, 1, 0.0,
        1, 0.01, 2, 0.0,
        0, 0.01, 3, 0.0,
        1, 0.01, 4, 0.0,
        0, 0.01, 5, 2.0,
        1, 0.01, 6, 0.0,
        0, 0.01, 7, 0.0,
        1, 0.00, 0, 0.0,
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"gate", rate:C.CONTROL, value:
          [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
          ]
        },
        { name:"levelScale" , value:1 },
        { name:"levelBias"  , value:0 },
        { name:"timeScale"  , value:1 },
        { name:"doneAction" , value:2 },
        { name:"initLevel"  , value:0 },
        { name:"numstages"  , value:9 },
        { name:"releaseNode", value:-99 },
        { name:"loopNode"   , value:-99 },
        0, 0.01, 0, 0.0,
        1, 0.01, 1, 0.0,
        0, 0.01, 2, 0.0,
        1, 0.01, 3, 0.0,
        0, 0.01, 4, 0.0,
        1, 0.01, 5, 2.0,
        0, 0.01, 6, 0.0,
        1, 0.01, 7, 0.0,
        0, 0.00, 0, 0.0,
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"gate", rate:C.CONTROL, value:
          [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
          ]
        },
        { name:"levelScale" , value:1 },
        { name:"levelBias"  , value:0 },
        { name:"timeScale"  , value:1 },
        { name:"doneAction" , value:2 },
        { name:"initLevel"  , value:1 },
        { name:"numstages"  , value:9 },
        { name:"releaseNode", value:6 },
        { name:"loopNode"   , rate:C.CONTROL, value:[5, 5, 5, 10, 10, 10] },
        1, 0.01, 0, 0.0,
        0, 0.01, 1, 0.0,
        1, 0.01, 2, 0.0,
        0, 0.01, 3, 0.0,
        1, 0.01, 4, 0.0,
        0, 0.01, 5, 2.0,
        1, 0.01, 6, 0.0,
        0, 0.01, 7, 0.0,
        1, 0.00, 0, 0.0,
      ]
    }
  ]);
  
  unitTestSuite("Linen", [
    { rate  : C.CONTROL,
      inputs: [
        { name:"gate", rate:C.CONTROL, value:
          [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1,-1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
            0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
          ]
        },
        { name:"attackTime" , value:0.01 },
        { name:"susLevel"   , value:0.05 },
        { name:"releaseTime", value:0.04 },
        { name:"doneAction" , value:2 },
      ]
    }
  ]);
  
  module.exports = {};

});
