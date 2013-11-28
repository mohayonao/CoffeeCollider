define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var reverb = require("./reverb");

  describe("plugins/reverb.js", function() {
    ugenTestSuite("FreeVerb", {
      ar: ["+in","audio"  , "mix",0.33, "room",0.5, "damp",0.5],
      kr: ["+in","control", "mix",0.33, "room",0.5, "damp",0.5]
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"mix" , rate:C.CONTROL, value:[ 0, 0.25, 0.5, 0.75, 1 ] },
          { name:"room", rate:C.CONTROL, value:[ 0, 0.5, 0.75, 1 ] },
          { name:"damp", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
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
  });

});
