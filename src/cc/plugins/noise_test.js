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
        inputs: [],
        checker: {
          WhiteNoise: function(result) {
            // console.log(result);
          },
          PinkNoise: function(result) {
            // console.log(result);
          },
          ClipNoise: function(result) {
            // console.log(result);
          },
        }
      }
    ]);

    ugenTestSuite(["Dust", "Dust2"], {
      ar: ["density",0],
      kr: ["density",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"density", rate:C.CONTROL, value:[10,10,20,20] },
        ],
        checker: {
          Dust: function(result) {
            // console.log(result);
          },
          Dust2: function(result) {
            // console.log(result);
          },
        }
      }
    ]);

    ugenTestSuite(["LFNoise0", "LFNoise1", "LFNoise2", "LFClipNoise"], {
      ar: ["freq",500],
      kr: ["freq",500],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq", rate:C.CONTROL, value:[500,500,500] },
        ],
        checker: {
          LFNoise0: function(result) {
            // console.log(result);
          },
          LFNoise1: function(result) {
            // console.log(result);
          },
          LFNoise2: function(result) {
            // console.log(result);
          },
          LFClipNoise: function(result) {
            // console.log(result);
          },
        }
      }
    ]);
  });

});
