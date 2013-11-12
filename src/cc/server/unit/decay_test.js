define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var delay = require("./decay");
  
  unitTestSuite("unit/decay.js", [
    [ "Integrator", ["ar", "kr"], 2, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
