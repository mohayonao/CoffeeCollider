define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var madd = require("./madd");

  unitTestSuite("unit/madd.js", [
    [ "MulAdd", 3, 1 ],
  ], {
    filter: function(obj) {
      var rate    = obj.rate;
      var inRates = obj.inRates;
      if (rate !== C.AUDIO) {
        return false;
      }
      return inRates[0] >= inRates[1];
    }
  });
  
  unitTestSuite("unit/madd.js", [
    [ "Sum3"  , 3, 1 ],
    [ "Sum4"  , 4, 1 ],
  ], {
    filter: function(obj) {
      var rate    = obj.rate;
      var inRates = obj.inRates;
      if (rate !== C.AUDIO) {
        return false;
      }
      return inRates.every(function(_, i) {
        return inRates[i] >= (inRates[i+1] || 0);
      });
    },
  });

});
