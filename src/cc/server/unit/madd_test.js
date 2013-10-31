define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var madd = require("./madd");

  describe("unit/madd.js", function() {
    
    describe("MulAdd", function() {
      unitTestSuite.ratesCombination(3).filter(function(items) {
        return items[0] >= items[1];
      }).forEach(function(items, i) {
        it("case " + items, function() {
          unitTestSuite([
            "MulAdd", C.CONTROL, 0, [ 0,0, 0,0, 0,0 ], [ C.AUDIO ]
          ], [
            unitTestSuite.inputSpec({
              name   : "in",
              rate   : items[0],
              value  : 0.1,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "mul",
              rate   : items[1],
              value  : 1,
              process: unitTestSuite.writer.liner(0, 1, 2)
            }),
            unitTestSuite.inputSpec({
              name   : "add",
              rate   : items[2],
              value  : 0,
              process: unitTestSuite.writer.liner(-1, -1, 2)
            }),
          ], {
            min:-2.5, max:+2.5,
          });
        });
      });
    });
    
    describe("Sum3", function() {
      unitTestSuite.ratesCombination(3).filter(function(items) {
        return items[0] > 0 && items[0] >= items[1] && items[1] >= items[2];
      }).forEach(function(items, i) {
        it("case " + items, function() {
          unitTestSuite([
            "Sum3", C.CONTROL, 0, [ 0,0, 0,0, 0,0 ], [ C.AUDIO ]
          ], [
            unitTestSuite.inputSpec({
              name   : "in0",
              rate   : items[0],
              value  : 0.1,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "in1",
              rate   : items[1],
              value  : 1,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "in2",
              rate   : items[2],
              value  : 0,
              process: unitTestSuite.writer.whiteNoise()
            }),
          ], {
            min:-3, max:+3,
          });
        });
      });
    });
      
    describe("Sum4", function() {
      unitTestSuite.ratesCombination(4).filter(function(items) {
        return items[0] > 0 && items[0] >= items[1] && items[1] >= items[2] && items[2] >= items[3];
      }).forEach(function(items, i) {
        it("case " + items, function() {
          unitTestSuite([
            "Sum4", C.CONTROL, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
          ], [
            unitTestSuite.inputSpec({
              name   : "in0",
              rate   : items[0],
              value  : 0.1,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "in1",
              rate   : items[1],
              value  : 1,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "in2",
              rate   : items[2],
              value  : 0,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name   : "in3",
              rate   : items[3],
              value  : 0,
              process: unitTestSuite.writer.whiteNoise()
            }),
          ], {
            min:-4, max:+4,
          });
        });
      });
    });
    
  });

});
