define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var range = require("./range");
  
  describe("plugins/range.js", function() {
    ugenTestSuite(["InRange", "Clip", "Fold", "Wrap"], {
      ar: ["+in","audio"  , "lo",0, "hi",1],
      kr: ["+in","control", "lo",0, "hi",1],
      ir: ["+in","scalar" , "lo",0, "hi",1],
    }).unitTestSuite([
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
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["LinLin", "LinExp", "ExpLin", "ExpExp"], {
      ar: ["+in","audio"  , "srclo",0, "srchi",1, "dstlo",1, "dsthi",2],
      kr: ["+in","control", "srclo",0, "srchi",1, "dstlo",1, "dsthi",2],
      ir: ["+in","scalar" , "srclo",0, "srchi",1, "dstlo",1, "dsthi",2],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"   , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"srclo", rate:C.CONTROL, value:[0, -1, -1, 1] },
          { name:"srchi", rate:C.CONTROL, value:[1, 0, 0, -1] },
          { name:"dstlo", rate:C.CONTROL, value:[0, 100, 100, 1000] },
          { name:"dsthi", rate:C.CONTROL, value:[1000, 100, 100, 0] },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"   , rate:C.CONTROL, value:[0, 0.5, 0.99] },
          { name:"srclo", value:0.001 },
          { name:"srchi", value:1 },
          { name:"dstlo", value:0.001 },
          { name:"dsthi", value:1000 },
        ]
      },
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN, "should not out NaN");
        // assert.isFalse(statistics.hasInfinity, "should not out Infinity");
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
  });

});
