define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
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
          { name:"in"  , rate:C.AUDIO  , value:unitTestSuite.trig0 },
          { name:"coef", rate:C.CONTROL, value:[ 0.95, 0.85 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });
    
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
          { name:"in"       , rate:C.AUDIO  , value:unitTestSuite.trig0 },
          { name:"decayTime", rate:C.CONTROL, value:[ 0, 0.025, 0.01 ] },
        ]
      },
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.1);
        assert.ok(statistics.max <= +1.1);
      }
    });

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
          { name:"in"        , rate:C.AUDIO  , value:unitTestSuite.trig0 },
          { name:"attackTime", rate:C.CONTROL, value:[ 0, 0.0025, 0.001, 0.0005 ] },
          { name:"decayTime" , rate:C.CONTROL, value:[ 0, 0.025, 0.01 ] },
        ]
      },
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });
  });

});
