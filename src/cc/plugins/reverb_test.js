define(function(require, exports, module) {
  "use strict";

  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var reverb = require("./reverb");

  describe("plugins/reverb.js", function() {
    ugenTestSuite("FreeVerb", {
      ar: ["+in","audio", "mix",0.33, "room",0.5, "damp",0.5]
    }).unitTestSuite([
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
  
});
