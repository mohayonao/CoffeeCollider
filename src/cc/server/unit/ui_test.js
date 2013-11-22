define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./suite_of_test");
  var ui = require("./ui");

  unitTestSuite.desc = "server/unit/ui.js";

  unitTestSuite(["MouseX", "MouseY"], [
    { rate  : C.CONTROL,
      inputs: [
        { name:"minval", rate:C.CONTROL, value:[0, 0, 0.5, 0.50, 1, 1] },
        { name:"maxval", rate:C.CONTROL, value:[1, 1, 0.5, 0.25, 0, 0] },
        { name:"warp"  , rate:C.CONTROL, value:[1, 1, 0.5, 0.25, 0, 0] },
        { name:"lag"   , rate:C.CONTROL, value:[1, 1, 0.5, 0.50, 0, 0] },
      ]
    },
  ], {
    beforeEach: function() {
      unitTestSuite.instance = {
        syncItems    : new Uint8Array(C.BUTTON + 1),
        f32_syncItems: new Float32Array(C.POS_Y + 1),
      };
    },
    preProcess: function(i, imax) {
      if (i % 64 === 0) {
        unitTestSuite.instance.f32_syncItems[C.POS_X ] = (i / imax);
        unitTestSuite.instance.f32_syncItems[C.POS_Y ] = (i / imax);
      }
    }
  });

  unitTestSuite(["MouseButton"], [
    { rate  : C.CONTROL,
      inputs: [
        { name:"minval", rate:C.CONTROL, value:[0, 0, 0.5, 0.50, 1, 1] },
        { name:"maxval", rate:C.CONTROL, value:[1, 1, 0.5, 0.25, 0, 0] },
        { name:"lag"   , rate:C.CONTROL, value:[1, 1, 0.5, 0.50, 0, 0] },
      ]
    },
  ], {
    beforeEach: function() {
      unitTestSuite.instance = {
        syncItems    : new Uint8Array(C.BUTTON + 1),
        f32_syncItems: new Float32Array(C.POS_Y + 1),
      };
    },
    preProcess: function(i, imax) {
      if (i % 64 === 0) {
        unitTestSuite.instance.f32_syncItems[C.BUTTON] = (i / imax) < 0.5 ? 0 : 1;
      }
    }
  });

});
