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
          unitTestSuite.inputSpec("minval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, i / imax);
              }
            }
          }),
          unitTestSuite.inputSpec("maxval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, 1 - (i / imax));
              }
            }
          }),
          unitTestSuite.inputSpec("warp", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 128 === 0) {
                unitTestSuite.writeScalarValue(inp, (i / imax) * 10);
              }
            }
          }),
          unitTestSuite.inputSpec("lag", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 128 === 0) {
                unitTestSuite.writeScalarValue(inp, (i / imax) * 10);
              }
            }
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
          unitTestSuite.inputSpec("minval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, i / imax);
              }
            }
          }),
          unitTestSuite.inputSpec("maxval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, 1 - (i / imax));
              }
            }
          }),
          unitTestSuite.inputSpec("warp", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 128 === 0) {
                unitTestSuite.writeScalarValue(inp, (i / imax) * 10);
              }
            }
          }),
          unitTestSuite.inputSpec("lag", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 128 === 0) {
                unitTestSuite.writeScalarValue(inp, (i / imax) * 10);
              }
            }
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
          unitTestSuite.inputSpec("minval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, i / imax);
              }
            }
          }),
          unitTestSuite.inputSpec("maxval", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 4 === 0) {
                unitTestSuite.writeScalarValue(inp, 1 - (i / imax));
              }
            }
          }),
          unitTestSuite.inputSpec("lag", C.CONTROL, {
            process: function(inp, i, imax) {
              if (i % 128 === 0) {
                unitTestSuite.writeScalarValue(inp, (i / imax) * 10);
              }
            }
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
