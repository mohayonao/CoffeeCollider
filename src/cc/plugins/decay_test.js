define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../testTools").unitTestSuite;
  var unit = require("../server/unit");
  var decay = require("./decay");

  unitTestSuite.desc = "plugins/decay.js";
  
  unitTestSuite("Integrator", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO  , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
        { name:"coef", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
        { name:"coef", rate:C.SCALAR, value:0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
        { name:"coef", rate:C.SCALAR, value:0.5 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
        { name:"coef", rate:C.SCALAR, value:1 },
      ]
    }
  ]);

  unitTestSuite("Decay", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"       , rate:C.AUDIO  , value:unitTestSuite.in0   },
        { name:"decayTime", rate:C.CONTROL, value:unitTestSuite.time0 },
      ]
    },
  ]);

  unitTestSuite("Decay2", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"        , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"attackTime", rate:C.CONTROL, value:unitTestSuite.time0 },
        { name:"decayTime" , rate:C.CONTROL, value:unitTestSuite.time0 },
      ]
    },
  ]);

});
