define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var ui = require("./ui");

  describe("plugins/ui.js", function() {
    ugenTestSuite(["MouseX", "MouseY"], {
      kr: ["minval",0, "maxval",1, "warp",0, "lag",0.2]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"minval", rate:C.CONTROL, value:[ 0, 0.25, 0.5, -0.5, -0.25, 1 ] },
          { name:"maxval", rate:C.CONTROL, value:[ 1, -0.65, 0.5, 0.25, 0 ] },
          { name:"warp"  , rate:C.CONTROL, value:[ 1, 0.5, 0.25, 0 ] },
          { name:"lag"   , rate:C.CONTROL, value:[ 1, 0.5, 0 ] },
        ]
      },
    ], {
      before: function() {
        unitTestSuite.instance = {
          f32_syncItems: new Float32Array(10),
        };
      },
      preProcess: function(i, imax) {
        if (i % 64 === 0) {
          unitTestSuite.instance.f32_syncItems[C.POS_X ] = (i / imax);
          unitTestSuite.instance.f32_syncItems[C.POS_Y ] = (i / imax);
        }
      },
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1);
        assert.ok(statistics.max <= +1);
      }
    });
    
    ugenTestSuite("MouseButton", {
      kr: ["minval",0, "maxval",1, "lag",0.2]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"minval", rate:C.CONTROL, value:[ 0, 0.25, 0.5, -0.5, -0.25, 1 ] },
          { name:"maxval", rate:C.CONTROL, value:[ 1, -0.65, 0.5, 0.25, 0 ] },
          { name:"lag"   , rate:C.CONTROL, value:[ 1, 0.5, 0 ] },
        ]
      },
    ], {
      before: function() {
        unitTestSuite.instance = {
          f32_syncItems: new Float32Array(10),
        };
      },
      preProcess: function(i, imax) {
        if (i % 64 === 0) {
          unitTestSuite.instance.f32_syncItems[C.BUTTON] = (i / imax) < 0.5 ? 0 : 1;
        }
      },
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1);
        assert.ok(statistics.max <= +1);
      }
    });
  });

});
