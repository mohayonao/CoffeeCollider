define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var pan = require("./pan");
  
  describe("unit/pan.js", function() {
    describe("Pan2", function() {
      unitTestSuite.ratesCombination(2).forEach(function(items, i) {
        it("case " + i, function() {
          unitTestSuite([
            "Pan2", C.AUDIO, 0, [ 0,0, 0,0, 0,0 ], [ C.AUDIO, C.AUDIO ]
          ], [
            unitTestSuite.inputSpec({
              name   : "in",
              rate   : C.AUDIO,
              process: unitTestSuite.writer.whiteNoise()
            }),
            unitTestSuite.inputSpec({
              name: "pos",
              rate: items[0],
              process: unitTestSuite.writer.liner(-1, 1, 0.5)
            }),
            unitTestSuite.inputSpec({
              name: "level",
              rate: items[1],
              process: unitTestSuite.writer.liner(-1, 1, 2)
            }),
          ]);
        });
      });
    });
  });

});
