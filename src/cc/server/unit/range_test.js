define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var range = require("./range");

  unitTestSuite("unit/range.js", [
    [ "InRange", ["ar", "kr", "ir"], 3, 1 ],
    [ "Clip"   , ["ar", "kr", "ir"], 3, 1 ],
    [ "Fold"   , ["ar", "kr", "ir"], 3, 1 ],
    [ "Wrap"   , ["ar", "kr", "ir"], 3, 1 ],
    [ "LinExp" , ["ar", "kr"      ], 5, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
