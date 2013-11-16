define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var reverb = require("./reverb");
  
  unitTestSuite("unit/reverb.js", [
    [ "FreeVerb", ["ar", "kr"], 4, 1 ],
  ], {
    filter: unitTestSuite.filterUGen
  });

});
