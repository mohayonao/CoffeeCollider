define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var ui = require("./ui");
  
  describe("unit/ui.js", function() {
    var instance;
    beforeEach(function() {
      instance = {
        syncItems    : new Uint8Array(C.BUTTON + 1),
        f32_syncItems: new Float32Array(C.POS_Y + 1),
      };
    });
    describe("MouseX", function() {
      it("kr", function() {
        unitTestSuite([
          "MouseX", C.CONTROL, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.CONTROL ]
        ], [
          unitTestSuite.inputSpec({
            name   : "minval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 1, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "maxval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(1, 0, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "warp",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 5, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "lag",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 5, 2)
          }),
        ], {
          instance: instance,
          preProcess: function(i, imax) {
            if (i % 64 === 0) {
              instance.f32_syncItems[C.POS_X] = i / imax;
            }
          }
        });
      });
    });
    describe("MouseY", function() {
      it("kr", function() {
        unitTestSuite([
          "MouseY", C.CONTROL, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.CONTROL ]
        ], [
          unitTestSuite.inputSpec({
            name   : "minval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 1, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "maxval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(1, 0, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "warp",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 5, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "lag",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 5, 2)
          }),
        ], {
          instance: instance,
          preProcess: function(i, imax) {
            if (i % 64 === 0) {
              instance.f32_syncItems[C.POS_Y] = i / imax;
            }
          }
        });
      });
    });
    describe("MouseButton", function() {
      it("kr", function() {
        unitTestSuite([
          "MouseButton", C.CONTROL, 0, [ 0,0, 0,0, 0,0 ], [ C.CONTROL ]
        ], [
          unitTestSuite.inputSpec({
            name   : "minval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 1, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "maxval",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(1, 0, 2)
          }),
          unitTestSuite.inputSpec({
            name   : "lag",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0, 5, 2)
          }),
        ], {
          instance: instance,
          preProcess: function(i) {
            if (i % 64 === 0) {
              instance.syncItems[C.BUTTON] = (i >> 2) & 1;
            }
          }
        });
      });
    });
  });

});
