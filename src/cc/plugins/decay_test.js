define(function(require, exports, module) {
  "use strict";
  
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;

  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var decay = require("./decay");

  describe("plugins/decay.js", function() {
    ugenTestSuite("Integrator", {
      ar: {
        ok: ["+in","audio", "coef",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "coef",1],
        ng: ["+in","audio"]
      },
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO  , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
          { name:"coef", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
          { name:"coef", rate:C.SCALAR, value:0 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
          { name:"coef", rate:C.SCALAR, value:0.5 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO , value:[ 1, 0.5, 0.25, 0, -0, -0.25, -0.5, -1 ] },
          { name:"coef", rate:C.SCALAR, value:1 },
        ]
      }
    ]);
    
    ugenTestSuite("Decay", {
      ar: {
        ok: ["+in","audio", "decayTime",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "decayTime",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"       , rate:C.AUDIO  , value:unitTestSuite.in0   },
          { name:"decayTime", rate:C.CONTROL, value:unitTestSuite.time0 },
        ]
      },
    ]);

    ugenTestSuite("Decay2", {
      ar: {
        ok: ["+in","audio", "attackTime",0.01, "decayTime",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "attackTime",0.01, "decayTime",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"        , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"attackTime", rate:C.CONTROL, value:unitTestSuite.time0 },
          { name:"decayTime" , rate:C.CONTROL, value:unitTestSuite.time0 },
        ]
      },
    ]);
  });

});
