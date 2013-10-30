define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var bufio = require("./bufio");
  
  describe("unit/bufio.js", function() {
    var instance;
    beforeEach(function() {
      instance = {
        buffers: [ null ]
      };
    });
    describe("PlayBuf", function() {
      it("ar", function() {
        unitTestSuite([
          "PlayBuf", C.AUDIO, 0, [ 0,0, 0,0, 0,0, 0,0, 0,0, 0,0 ], [ C.AUDIO ]
        ], [
          unitTestSuite.inputSpec("bufer"     , C.SCALAR ),
          unitTestSuite.inputSpec("rate"      , C.CONTROL),
          unitTestSuite.inputSpec("trigger"   , C.CONTROL),
          unitTestSuite.inputSpec("startPos"  , C.SCALAR ),
          unitTestSuite.inputSpec("loop"      , C.SCALAR ),
          unitTestSuite.inputSpec("doneAction", C.SCALAR ),
        ], {
          instance: instance,
          preProcess: function(i) {
            if (i === 1) {
              instance.buffers[0] = {
                samples : unitTestSuite.writeWhiteNoise(new Float32Array(1024)),
                channels: 1,
                frames  : 1024,
              };
            }
          }
        });
      });
    });
  });

});
