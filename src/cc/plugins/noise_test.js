define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var noise = require("./noise");

  describe("plugins/noise.js", function() {
    ugenTestSuite(["WhiteNoise", "BrownNoise", "PinkNoise", "ClipNoise", "GrayNoise"], {
      ar: [],
      kr: [],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [],
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["Dust", "Dust2"], {
      ar: ["density",0],
      kr: ["density",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"density", rate:C.CONTROL, value:[ 10, 5, 20 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite("Crackle", {
      ar: ["chaosParam",1.5],
      kr: ["chaosParam",1.5],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"chaosParam", rate:C.CONTROL, value:[ 0, 1.5, 2, -1.5 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
    
    ugenTestSuite("Logistic", {
      ar: ["chaosParam",1.5, "freq",1000, "init",0.5],
      kr: ["chaosParam",1.5, "freq",1000, "init",0.5],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"chaosParam", rate:C.CONTROL, value:[ 0, 1.5, 2, -1.5 ] },
          { name:"freq"      , rate:C.CONTROL, value:[ 250, 500, 1000, 2000 ] },
          { name:"init"      , rate:C.CONTROL, value:[ 0, 0.25, 0.5, 0.75, 1, 1.5 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
    
    ugenTestSuite([
      "LFNoise0", "LFNoise1", "LFNoise2", "LFClipNoise",
      "LFDNoise0", "LFDNoise1", "LFDNoise3", "LFDClipNoise"
    ], {
      ar: ["freq",500],
      kr: ["freq",500],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq", rate:C.CONTROL, value:[ 500, 1000 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
  });

});
