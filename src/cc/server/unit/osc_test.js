define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var osc = require("./osc");

  unitTestSuite("unit/osc.js", [
    [ "FSinOsc" , ["ar", "kr"], 2, 1 ],
    [ "SinOsc"  , ["ar", "kr"], 2, 1 ],
    [ "SinOscFB", ["ar", "kr"], 2, 1 ],
    [ "LFSaw"   , ["ar", "kr"], 2, 1 ],
    [ "LFPar"   , ["ar", "kr"], 2, 1 ],
    [ "LFCub"   , ["ar", "kr"], 2, 1 ],
    [ "LFTri"   , ["ar", "kr"], 2, 1 ],
    [ "LFPulse" , ["ar", "kr"], 3, 1 ],
  ]);

});
