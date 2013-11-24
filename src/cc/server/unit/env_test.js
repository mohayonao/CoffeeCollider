define(function(require, exports, module) {
  "use strict";

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit = require("./unit");
  var env  = require("./env");

  unitTestSuite.desc = "server/unit/env.js";
  
  unitTestSuite("EnvGen", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"gate"      , rate:C.SCALAR, value:1 },
        { name:"levelScale", rate:C.SCALAR, value:1 },
        { name:"levelBias" , rate:C.SCALAR, value:0 },
        { name:"timeScale" , rate:C.SCALAR, value:1 },
        { name:"doneAction", rate:C.SCALAR, value:0 },
        
        { rate:C.SCALAR, value: 0.0 },
        { rate:C.SCALAR, value: 2.0 },
        { rate:C.SCALAR, value: -99 },
        { rate:C.SCALAR, value: -99 },
        { rate:C.SCALAR, value: 1.0 },
        { rate:C.SCALAR, value: 0.5 },
        { rate:C.SCALAR, value: 3.0 },
        { rate:C.SCALAR, value: 0.0 },
        { rate:C.SCALAR, value: 0.0 },
        { rate:C.SCALAR, value: 0.5 },
        { rate:C.SCALAR, value: 3.0 },
        { rate:C.SCALAR, value: 0.0 },
      ]
    }
  ]);
  
  module.exports = {};

});
