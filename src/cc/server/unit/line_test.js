define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var line = require("./line");

  unitTestSuite("unit/line.js", [
    [ "Line", ["ar", "kr"], 4, 1 ]
  ], {
    filter: function(obj) {
      return obj.inRates.every(function(rate) {
        return rate !== C.AUDIO;
      });
    }
  });

});
