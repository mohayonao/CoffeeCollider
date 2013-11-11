define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var pan = require("./pan");

  unitTestSuite("unit/pan.js", [
    [ "Pan2", ["ar", "kr"], 3, 2 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
