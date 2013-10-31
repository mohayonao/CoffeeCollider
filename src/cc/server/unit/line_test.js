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
          unitTestSuite.inputSpec({
            name : "start",
            rate : C.SCALAR,
            value: 0
          }),
          unitTestSuite.inputSpec({
            name : "end",
            rate : C.SCALAR,
            value: 1
          }),
          unitTestSuite.inputSpec({
            name : "dur",
            rate : C.SCALAR,
            value: 0.5
          }),
          unitTestSuite.inputSpec({
            name : "doneAction",
            rate : C.SCALAR,
            value: 0
          }),
        ]);
      });
      it("kr", function() {
        unitTestSuite([
          "Line", C.CONTROL, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.CONTROL ]
        ], [
          unitTestSuite.inputSpec({
            name : "start",
            rate : C.SCALAR,
            value: 0
          }),
          unitTestSuite.inputSpec({
            name : "end",
            rate : C.SCALAR,
            value: 1
          }),
          unitTestSuite.inputSpec({
            name : "dur",
            rate : C.SCALAR,
            value: 0.5
          }),
          unitTestSuite.inputSpec({
            name : "doneAction",
            rate : C.SCALAR,
            value: 0
          }),
        ]);
      });
    });
  });

});
