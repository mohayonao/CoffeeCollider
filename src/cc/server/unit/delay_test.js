define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./delay");
  
  describe("unit/delay.js", function() {
    describe("CombN", function() {
      it("ar", function() {
        unitTestSuite([
          "CombN", C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("in"          , C.AUDIO, {
            process: unitTestSuite.writeWhiteNoise
          }),
          unitTestSuite.inputSpec("maxdelaytime", C.SCALAR, {
            value: 1
          }),
          unitTestSuite.inputSpec("delaytime"   , C.CONTROL),
          unitTestSuite.inputSpec("decaytime"   , C.CONTROL),
        ]);
      });
    });
    describe("CombL", function() {
      it("ar", function() {
        unitTestSuite([
          "CombL", C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("in"          , C.AUDIO, {
            process: unitTestSuite.writeWhiteNoise
          }),
          unitTestSuite.inputSpec("maxdelaytime", C.SCALAR, {
            value: 1
          }),
          unitTestSuite.inputSpec("delaytime"   , C.CONTROL),
          unitTestSuite.inputSpec("decaytime"   , C.CONTROL),
        ]);
      });
    });
    describe("CombC", function() {
      it("ar", function() {
        unitTestSuite([
          "CombC", C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("in"          , C.AUDIO, {
            process: unitTestSuite.writeWhiteNoise
          }),
          unitTestSuite.inputSpec("maxdelaytime", C.SCALAR, {
            value: 1
          }),
          unitTestSuite.inputSpec("delaytime"   , C.CONTROL),
          unitTestSuite.inputSpec("decaytime"   , C.CONTROL),
        ]);
      });
    });
  });

});
