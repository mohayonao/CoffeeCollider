define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var bufio = require("./bufio");

  var writeWhiteNoise = function(_in) {
    for (var i = _in.length; i--; ) {
      _in[i] = Math.random() * 2 - 1;
    }
    return _in;
  };
  
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
          unitTestSuite.inputSpec({
            name: "bufer",
            rate: C.SCALAR
          }),
          unitTestSuite.inputSpec({
            name   : "rate",
            rate   : C.CONTROL,
            process: unitTestSuite.writer.liner(0.5, 1.5, 2)
          }),
          unitTestSuite.inputSpec({
            name: "trigger",
            rate: C.CONTROL
          }),
          unitTestSuite.inputSpec({
            name: "startPos",
            rate: C.SCALAR
          }),
          unitTestSuite.inputSpec({
            name : "loop",
            rate : C.SCALAR,
            value: 1
          }),
          unitTestSuite.inputSpec({
            name: "doneAction",
            rate: C.SCALAR
          }),
        ], {
          instance: instance,
          preProcess: function(i) {
            if (i === 1) {
              instance.buffers[0] = {
                samples : writeWhiteNoise(new Float32Array(1024)),
                channels: 1,
                frames  : 1024,
              };
            }
          },
          min:-1.5, max:1.5
        });
      });
    });
  });

});
