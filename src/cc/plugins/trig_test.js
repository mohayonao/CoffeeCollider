define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var unitTestSuite = require("../../testTools").unitTestSuite;
  var unit = require("../server/unit");
  var trig = require("./trig");

  unitTestSuite.desc = "plugins/trig.js";
  
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

  unitTestSuite("Phasor", [
    { rate: C.AUDIO,
      inputs: [
        { name:"trig"    , rate:C.CONTROL, value:unitTestSuite.trig0 },
        { name:"rate"    , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"start"   , rate:C.CONTROL, value:[-1,-0.5,0,+0.5,+1] },
        { name:"end"     , rate:C.CONTROL, value:[+1,+0.5,0,-0.5,-1,-1] },
        { name:"resetPos", rate:C.CONTROL, value:[+0.5,0,-0.5] },
      ]
    }
  ]);
  
  module.exports = {};

});
