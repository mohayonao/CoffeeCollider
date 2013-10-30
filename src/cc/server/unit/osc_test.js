define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var osc = require("./osc");
  
  describe("unit/osc.js", function() {
    describe("SinOsc", function() {
      it("ar", function() {
        unitTestSuite([
          "SinOsc", C.AUDIO, 0, [ 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("freq", C.SCALAR, {
            value: 440
          }),
          unitTestSuite.inputSpec("phase", C.SCALAR, {
            value: 0
          }),
        ]);
      });
    });
  });

});
