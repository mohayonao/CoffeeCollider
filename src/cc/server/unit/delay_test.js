define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./delay");

  unitTestSuite("unit/delay.js", [
    [ "Delay1", ["ar", "kr"], 1, 1 ],
    [ "Delay2", ["ar", "kr"], 1, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

  unitTestSuite("unit/delay.js", [
    [ "DelayN", ["ar", "kr"], 3, 1 ],
    [ "DelayL", ["ar", "kr"], 3, 1 ],
    [ "DelayC", ["ar", "kr"], 3, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      if (inRates[1] !== C.SCALAR) {
        // maxDelayTime
        return false;
      }
      if (inRates[1] !== C.CONTROL) {
        // delayTime
        return false;
      }
      return unitTestSuite.filterUGen(obj);
    }
  });
  
  unitTestSuite("unit/delay.js", [
    [ "CombN", ["ar", "kr"], 4, 1 ],
    [ "CombL", ["ar", "kr"], 4, 1 ],
    [ "CombC", ["ar", "kr"], 4, 1 ],
    [ "AllpassN", ["ar", "kr"], 4, 1 ],
    [ "AllpassL", ["ar", "kr"], 4, 1 ],
    [ "AllpassC", ["ar", "kr"], 4, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      if (inRates[1] !== C.SCALAR) {
        // maxDelayTime
        return false;
      }
      if (inRates[2] !== C.CONTROL) {
        // delayTime
        return false;
      }
      if (inRates[3] !== C.CONTROL) {
        // decayTime
        return false;
      }
      return unitTestSuite.filterUGen(obj);
    }
  })

});
