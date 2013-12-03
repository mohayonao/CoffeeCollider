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
    ugenTestSuite(["WhiteNoise", "PinkNoise", "ClipNoise"], {
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
