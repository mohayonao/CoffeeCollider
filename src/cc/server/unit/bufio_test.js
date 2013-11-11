define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var bufio = require("./bufio");

  unitTestSuite("unit/bufio", [
    [ "PlayBuf", 6, 1 ]
  ], {
    filter: function(obj) {
      var rate    = obj.rate;
      var inRates = obj.inRates;
      if (rate === C.SCALAR) {
        return false;
      }
      if (inRates[3] !== C.CONTROL) {
        // phase
        return false;
      }
      if (inRates[4] !== C.CONTROL) {
        // loop
        return false;
      }
      if (inRates[5] !== C.SCALAR) {
        // doneAction
        return false;
      }
      return true;
    },
    beforeEach: function() {
      unitTestSuite.instance = {
        buffers: [ null ]
      };
    },
    preProcess: function(i) {
      if (i === 1) {
        unitTestSuite.instance.buffers[0] = {
          samples : new Float32Array(1024),
          channels: 1,
          frames  : 1024,
        };
      }
    }
  });

});
