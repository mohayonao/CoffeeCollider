define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./delay");
  
  unitTestSuite("unit/delay.js", [
    [ "CombN", 4, 1 ],
    [ "CombL", 4, 1 ],
    [ "CombC", 4, 1 ],
  ], {
    filter: function(obj) {
      var rate    = obj.rate;
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
