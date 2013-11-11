define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var osc = require("./osc");

  unitTestSuite("unit/osc.js", [
    [ "SinOsc"  , 2, 1 ],
    [ "SinOscFB", 2, 1 ],
    [ "LFSaw"   , 2, 1 ],
    [ "LFPar"   , 2, 1 ],
    [ "LFCub"   , 2, 1 ],
    [ "LFTri"   , 2, 1 ],
    [ "LFPulse" , 3, 1 ],
  ]);

});
