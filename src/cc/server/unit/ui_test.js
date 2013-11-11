define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var ui = require("./ui");

  var instance;
  
  unitTestSuite("unit/ui.js", [
    [ "MouseX"     , ["kr"], 4, 1],
    [ "MouseY"     , ["kr"], 4, 1],
    [ "MouseButton", ["kr"], 3, 1],
  ], {
    filter: function(obj) {
      return obj.inRates.every(function(rate) {
        return rate !== C.AUDIO;
      });
    },
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
        unitTestSuite.instance.f32_syncItems[C.BUTTON] = (i / imax) < 0.5 ? 0 : 1;
      }
    }
  });

});
