define(function(require, exports, module) {
  "use strict";

  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var noise = require("./noise");

  describe("plugins/noise.js", function() {
    ugenTestSuite(["WhiteNoise", "PinkNoise", "ClipNoise"], {
      ar: [],
      kr: [],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: []
      }
    ]);

    ugenTestSuite(["Dust", "Dust2"], {
      ar: ["density",0],
      kr: ["density",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"density", rate:C.CONTROL, value:unitTestSuite.time1 },
        ]
      }
    ]);

    ugenTestSuite(["LFNoise0", "LFNoise1", "LFNoise2", "LFClipNoise"], {
      ar: ["freq",500],
      kr: ["freq",500],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq", rate:C.CONTROL, value:unitTestSuite.freq1 },
        ]
      }
    ]);
  });

});
