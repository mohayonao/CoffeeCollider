define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var line = require("./line");
  
  describe("unit/line.js", function() {
    describe("Line", function() {
      it("ar", function() {
        unitTestSuite([
          "Line", C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("start", C.SCALAR, {
            value: 0
          }),
          unitTestSuite.inputSpec("end", C.SCALAR, {
            value: 1
          }),
          unitTestSuite.inputSpec("dur", C.SCALAR, {
            value: 0.5
          }),
          unitTestSuite.inputSpec("doneAction", C.SCALAR, {
            value: 0
          }),
        ]);
      });
      it("kr", function() {
        unitTestSuite([
          "Line", C.CONTROL, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.CONTROL ]
        ], [
          unitTestSuite.inputSpec("start", C.SCALAR, {
            value: 0
          }),
          unitTestSuite.inputSpec("end", C.SCALAR, {
            value: 1
          }),
          unitTestSuite.inputSpec("dur", C.SCALAR, {
            value: 0.5
          }),
          unitTestSuite.inputSpec("doneAction", C.SCALAR, {
            value: 0
          }),
        ]);
      });
    });
  });

});
