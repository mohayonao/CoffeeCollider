define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit = require("./unit");
  var trig = require("./trig");

  unitTestSuite.desc = "server/unit/trig.js";
  
  unitTestSuite(["Trig", "Trig1"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO, value:unitTestSuite.in0   },
        { name:"dur", rate:C.AUDIO, value:unitTestSuite.in1 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0   },
        { name:"dur", rate:C.CONTROL, value:unitTestSuite.in1 },
      ]
    }
  ]);
  
  unitTestSuite(["Latch", "Gate"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0   },
        { name:"trig", rate:C.AUDIO, value:unitTestSuite.trig0 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0   },
        { name:"trig", rate:C.CONTROL, value:unitTestSuite.trig0 },
      ]
    }
  ]);
  
  module.exports = {};

});
