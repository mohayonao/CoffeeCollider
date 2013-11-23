define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("../../../testTools").unitTestSuite;
  var unit   = require("./unit");
  var reverb = require("./reverb");

  unitTestSuite.desc = "server/unit/reverb.js";

  unitTestSuite("FreeVerb", [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in"  , rate:C.AUDIO  , value:[ 220,440,440,220,0,-220,-440,-440,-220 ] },
        { name:"mix" , rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        { name:"room", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        { name:"damp", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
      ]
    }
  ]);

});
