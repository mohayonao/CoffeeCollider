define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var env = require("./env");

  describe("plugins/env.js", function() {
    ugenTestSuite("EnvGen", {
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"gate", rate:C.CONTROL, value:
            [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
            ]
          },
          { name:"levelScale" , value:1 },
          { name:"levelBias"  , value:0 },
          { name:"timeScale"  , value:1 },
          { name:"doneAction" , value:0 },
          { name:"initLevel"  , value:0 },
          { name:"numstages"  , value:9 },
          { name:"releaseNode", value:-99 },
          { name:"loopNode"   , value:-99 },
          0, 0.01, 0, 0.0,
          1, 0.01, 1, 0.0,
          0, 0.01, 2, 0.0,
          1, 0.01, 3, 0.0,
          0, 0.01, 4, 0.0,
          1, 0.01, 5, 2.0,
          0, 0.01, 6, 0.0,
          1, 0.01, 7, 0.0,
          0, 0.00, 0, 0.0,
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"gate", rate:C.CONTROL, value:
            [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
            ]
          },
          { name:"levelScale" , value:1 },
          { name:"levelBias"  , value:0 },
          { name:"timeScale"  , value:1 },
          { name:"doneAction" , value:2 },
          { name:"initLevel"  , value:1 },
          { name:"numstages"  , value:9 },
          { name:"releaseNode", value:6 },
          { name:"loopNode"   , rate:C.CONTROL, value:[5, 5, 5, 10, 10, 10, 10] },
          1, 0.01, 0, 0.0,
          0, 0.01, 1, 0.0,
          1, 0.01, 2, 0.0,
          0, 0.01, 3, 0.0,
          1, 0.01, 4, 0.0,
          0, 0.01, 5, 2.0,
          1, 0.01, 6, 0.0,
          0, 0.01, 7, 0.0,
          1, 0.00, 0, 0.0,
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"gate", rate:C.CONTROL, value:
            [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
            ]
          },
          { name:"levelScale" , value:1 },
          { name:"levelBias"  , value:0 },
          { name:"timeScale"  , value:1 },
          { name:"doneAction" , value:2 },
          { name:"initLevel"  , value:0 },
          { name:"numstages"  , value:9 },
          { name:"releaseNode", value:-99 },
          { name:"loopNode"   , value:-99 },
          0, 0.01, 0, 0.0,
          1, 0.01, 1, 0.0,
          0, 0.01, 2, 0.0,
          1, 0.01, 3, 0.0,
          0, 0.01, 4, 0.0,
          1, 0.01, 5, 2.0,
          0, 0.01, 6, 0.0,
          1, 0.01, 7, 0.0,
          0, 0.00, 0, 0.0,
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"gate", rate:C.CONTROL, value:
            [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0,-1,
            ]
          },
          { name:"levelScale" , value:1 },
          { name:"levelBias"  , value:0 },
          { name:"timeScale"  , value:1 },
          { name:"doneAction" , value:2 },
          { name:"initLevel"  , value:1 },
          { name:"numstages"  , value:9 },
          { name:"releaseNode", value:6 },
          { name:"loopNode"   , rate:C.CONTROL, value:[5, 5, 5, 10, 10, 10] },
          1, 0.01, 0, 0.0,
          0, 0.01, 1, 0.0,
          1, 0.01, 2, 0.0,
          0, 0.01, 3, 0.0,
          1, 0.01, 4, 0.0,
          0, 0.01, 5, 2.0,
          1, 0.01, 6, 0.0,
          0, 0.01, 7, 0.0,
          1, 0.00, 0, 0.0,
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
    
    ugenTestSuite("Linen", {
      kr: ["gate",1, "attackTime",0.01, "susLevel",1, "releaseTime",1, "doneAction",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"gate", rate:C.CONTROL, value:
            [ 0, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1,-1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1,  1, 1, 1, 1, 1, 1, 1, 1,
              0, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
            ]
          },
          { name:"attackTime" , value:0.01 },
          { name:"susLevel"   , value:0.05 },
          { name:"releaseTime", value:0.04 },
          { name:"doneAction" , value:2 },
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
