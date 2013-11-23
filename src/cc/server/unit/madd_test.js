define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit = require("./unit");
  var madd = require("./madd");

  unitTestSuite.desc = "server/unit/madd.js";

  unitTestSuite(["MulAdd"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.AUDIO , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in" , rate:C.SCALAR, value:0.01 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.SCALAR, value:0.01 },
      ]
    },
  ]);

  unitTestSuite(["Sum3"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR , value:0.01 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in0", rate:C.SCALAR, value:0.01 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
  ]);

  unitTestSuite(["Sum4"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO, value:unitTestSuite.in2 },
        { name:"in3", rate:C.AUDIO, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO  , value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO , value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in0", rate:C.SCALAR, value:unitTestSuite.in1 },
        { name:"in1", rate:C.SCALAR, value:unitTestSuite.in2 },
        { name:"in2", rate:C.SCALAR, value:unitTestSuite.in1 },
        { name:"in3", rate:C.SCALAR, value:unitTestSuite.in2 },
      ]
    },
  ]);

});
