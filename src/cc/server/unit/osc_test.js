define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var osc = require("./osc");
  
  describe("unit/osc.js", function() {
    describe("SinOsc", function() {
      unitTestSuite.ratesCombination(2).forEach(function(items, i) {
        it("case " + i, function() {
          unitTestSuite([
            "SinOsc", C.AUDIO, 0, [ 0,0, 0,0 ], [ C.AUDIO ]
          ], [
            unitTestSuite.inputSpec({
              name   : "freq",
              rate   : items[0],
              value  : 440,
              process: unitTestSuite.writer.liner(220, 880, 2)
            }),
            unitTestSuite.inputSpec({
              name   : "phase",
              rate   : items[1],
              value  : 0,
              process: unitTestSuite.writer.liner(0, Math.PI, 1)
            }),
          ]);
        });
      });
    });
  });

});
