define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./delay");
  
  describe("unit/delay.js", function() {
    ["CombN", "CombL", "CombC"].forEach(function(name) {
      describe(name, function() {
        unitTestSuite.ratesCombination(2).forEach(function(items, i) {
          it("case " + i, function() {
            unitTestSuite([
              name, C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
            ], [
              unitTestSuite.inputSpec({
                name   : "in",
                rate   : C.AUDIO,
                process: unitTestSuite.writer.whiteNoise()
              }),
              unitTestSuite.inputSpec({
                name : "maxdelaytime",
                rate : C.SCALAR,
                value: 1
              }),
              unitTestSuite.inputSpec({
                name   : "delaytime",
                rate   : items[0],
                process: unitTestSuite.writer.liner(0, 2, 2)
              }),
              unitTestSuite.inputSpec({
                name   :"decaytime",
                rate   : items[1],
                process: unitTestSuite.writer.liner(0, 2, 2)
              }),
            ]);
          });
        });
      });
    });
  });

});
