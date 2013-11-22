define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var pan = require("./pan");
  
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

});
