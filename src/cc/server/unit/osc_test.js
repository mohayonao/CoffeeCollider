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
  ], {
    madd: [
      [ 800, 1600 ],
    ]
  });

  unitTestSuite("unit/osc.js", [
    [ "Blip", ["ar"], 2, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      if (inRates[0] !== C.CONTROL) {
        // freq
        return false;
      }
      if (inRates[1] !== C.CONTROL) {
        // numharm
        return false;
      }
      return true;
    },
    madd: [
      [ 800, 1600 ],
      [  20,  200 ],
    ]
  });

  unitTestSuite("unit/osc.js", [
    [ "Saw", ["ar"], 1, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      if (inRates[0] !== C.CONTROL) {
        // freq
        return false;
      }
      return true;
    },
    madd: [
      [ 800, 1600 ],
    ]
  });

  unitTestSuite("unit/osc.js", [
    [ "Pulse", ["ar"], 2, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      if (inRates[0] !== C.CONTROL) {
        // freq
        return false;
      }
      return true;
    },
    madd: [
      [ 800, 1600 ],
    ]
  });

});
