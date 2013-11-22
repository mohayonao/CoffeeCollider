define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./delay");
  
  unitTestSuite.desc = "server/unit/delay.js";
  
  unitTestSuite(["Delay1", "Delay2"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
  ]);
  
  unitTestSuite(["DelayN", "DelayL", "DelayC"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"          , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"maxdelaytime", rate:C.SCALAR , value:0.25 },
        { name:"delaytime"   , rate:C.CONTROL, value:unitTestSuite.time0 },
      ]
    },
  ]);

  unitTestSuite(["CombN", "CombL", "CombC", "AllpassN", "AllpassL", "AllpassC"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"          , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"maxdelaytime", rate:C.SCALAR , value:0.25 },
        { name:"delaytime"   , rate:C.CONTROL, value:unitTestSuite.time0 },
        { name:"decaytime"   , rate:C.CONTROL, value:unitTestSuite.time1 },
      ]
    },
  ]);

});
