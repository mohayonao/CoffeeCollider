define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var noise = require("./noise");

  unitTestSuite.desc = "server/unit/noise.js";

  unitTestSuite(["WhiteNoise", "PinkNoise", "ClipNoise"], [
    { rate  : C.AUDIO,
      inputs: []
    }
  ]);

  unitTestSuite(["Dust", "Dust2"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"density", rate:C.CONTROL, value:unitTestSuite.time1 },
      ]
    }
  ]);

  unitTestSuite(["LFNoise0", "LFNoise1", "LFNoise2", "LFClipNoise"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"freq", rate:C.CONTROL, value:unitTestSuite.freq1 },
      ]
    }
  ]);

});
