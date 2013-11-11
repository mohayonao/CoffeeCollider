define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var filter = require("./filter");

  unitTestSuite("unit/filter.js", [
    [ "RLPF", ["ar", "kr"], 3, 1 ],
    [ "RHPF", ["ar", "kr"], 3, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
