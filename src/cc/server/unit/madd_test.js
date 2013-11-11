define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var madd = require("./madd");

  unitTestSuite("unit/madd.js", [
    [ "MulAdd", ["ar", "kr", "ir"], 3, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      return inRates[0] >= inRates[1];
    }
  });
  
  unitTestSuite("unit/madd.js", [
    [ "Sum3", ["ar", "kr", "ir"],  3, 1 ],
    [ "Sum4", ["ar", "kr", "ir"],  4, 1 ],
  ], {
    filter: function(obj) {
      var inRates = obj.inRates;
      return inRates.every(function(_, i) {
        return inRates[i] >= (inRates[i+1] || 0);
      });
    },
  });

});
