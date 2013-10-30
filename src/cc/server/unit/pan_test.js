define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var pan = require("./pan");
  
  describe("unit/pan.js", function() {
    describe("Pan2", function() {
      unitTestSuite([
        "Pan2", C.AUDIO, 0, [ 0,0, 0,0, 0,0 ], [ C.AUDIO, C.AUDIO ]
      ], [
        unitTestSuite.inputSpec("in"   , C.AUDIO, {
            process: unitTestSuite.writeWhiteNoise
        }),
        unitTestSuite.inputSpec("pos"  , C.CONTROL),
        unitTestSuite.inputSpec("level", C.CONTROL),
      ]);
    });
  });

});
