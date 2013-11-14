define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var filter = require("./filter");

  unitTestSuite("unit/filter.js", [
    [ "RLPF", ["ar", "kr"], 3, 1 ],
    [ "RHPF", ["ar", "kr"], 3, 1 ],
    [ "Lag" , ["ar", "kr"], 2, 1 ],
    [ "Lag2", ["ar", "kr"], 2, 1 ],
    [ "Lag3", ["ar", "kr"], 2, 1 ],
    [ "Ramp", ["ar", "kr"], 2, 1 ],
    [ "LagUD" , ["ar", "kr"], 3, 1 ],
    [ "Lag2UD", ["ar", "kr"], 3, 1 ],
    [ "Lag3UD", ["ar", "kr"], 3, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
