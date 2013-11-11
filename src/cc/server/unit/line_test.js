define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var line = require("./line");

  unitTestSuite("unit/line.js", [
    [ "Line", 4, 1 ]
  ], {
    filter: function(obj) {
      var rate    = obj.rate;
      var inRates = obj.inRates;
      if (rate === C.SCALAR) {
        return false;
      }
      return inRates.every(function(rate) {
        return rate !== C.AUDIO;
      });
    }
  });

});
