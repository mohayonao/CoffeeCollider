define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../testTools").unitTestSuite;
  var unit = require("../server/unit");
  var range = require("./range");
  
  unitTestSuite.desc = "plugins/range.js";
  
  unitTestSuite(["InRange", "Clip", "Fold", "Wrap"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"lo", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"hi", rate:C.AUDIO, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"lo", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"hi", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    }
  ]);

});
