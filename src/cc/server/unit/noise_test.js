define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var noise = require("./noise");

  unitTestSuite("unit/noise.js", [
    [ "WhiteNoise", ["ar", "kr"], 0, 1 ],
    [ "PinkNoise" , ["ar", "kr"], 0, 1 ],
  ]);

});
