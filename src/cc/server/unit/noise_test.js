define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var noise = require("./noise");

  unitTestSuite("unit/noise.js", [
    [ "WhiteNoise", 0, 1 ]
  ]);

});
