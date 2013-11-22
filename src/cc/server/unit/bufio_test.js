define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./suite_of_test");
  var bufio = require("./bufio");

  unitTestSuite.desc = "server/unit/bufio.js";

  unitTestSuite("PlayBuf", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"bufnum"    , rate:C.SCALAR, value:0 },
        { name:"rate"      , rate:C.SCALAR, value:1 },
        { name:"trigger"   , rate:C.SCALAR, value:0 },
        { name:"startPos"  , rate:C.SCALAR, value:0 },
        { name:"loop"      , rate:C.SCALAR, value:0 },
        { name:"doneAction", rate:C.SCALAR, value:0 },
      ]
    },
  ], {
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
