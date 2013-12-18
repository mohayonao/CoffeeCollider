define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var filter = require("./filter");

  describe("plugins/filter.js", function() {
    ugenTestSuite("Resonz", {
      ar: {
        ok: [ ["+in","audio", "freq",440, "bwr",1] ],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440, "bwr",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO  , value:unitTestSuite.in0   },
          { name:"freq", rate:C.CONTROL, value:[ 440, 660, 1000 ] },
          { name:"bwr" , rate:C.CONTROL, value:[ 0.1, 0.25, 0.5, 1 ] },
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

    ugenTestSuite(["OnePole", "OneZero"], {
      ar: {
        ok: ["+in","audio", "coef",0.5],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "coef",0.5],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"coef", rate:C.CONTROL, value:[ -1, 5, 0, -0.5, 1 ] },
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
    
    ugenTestSuite(["TwoPole", "TwoZero", "APF"], {
      ar: {
        ok: ["+in","audio", "freq",440, "radius",0.8],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440, "radius",0.8],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"    , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"freq"  , rate:C.CONTROL, value:[ 440, 660, 1000 ] },
          { name:"radius", rate:C.CONTROL, value:[ 0.1, 0.25 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["LPF", "HPF"], {
      ar: {
        ok: ["+in","audio", "freq",440],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"freq", rate:C.AUDIO, value:[ 440, 660, 1000 ] },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"freq", rate:C.CONTROL, value:[ 44, 66, 100 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["BPF", "BRF"], {
      ar: {
        ok: ["+in","audio", "freq",440, "rq",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440, "rq",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"freq", rate:C.AUDIO, value:[ 440, 660, 1000 ] },
          { name:"rq"  , rate:C.AUDIO, value:[ 0, 0.25, 0.5, 1 ] },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"freq", rate:C.CONTROL, value:[ 44, 66, 100 ] },
          { name:"rq"  , rate:C.CONTROL, value:[ 0, 0.25, 0.5, 1 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["RLPF", "RHPF"], {
      ar: {
        ok: ["+in","audio", "freq",440, "rq",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440, "rq",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"freq", rate:C.AUDIO, value:[ 440, 660, 1000 ] },
          { name:"rq"  , rate:C.AUDIO, value:[ 0, 0.25, 0.5, 1 ] },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"freq", rate:C.CONTROL, value:[ 44, 66, 100 ] },
          { name:"rq"  , rate:C.CONTROL, value:[ 0, 0.25, 0.5, 1 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite("MidEQ", {
      ar: {
        ok: ["+in","audio", "freq",440, "rq",1, "db",0],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "freq",440, "rq",1, "db",0],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"freq", rate:C.CONTROL, value:[ 440, 660, 1000 ] },
          { name:"rq"  , rate:C.CONTROL, value:[ 0, 0.25, 0.5, 1 ] },
          { name:"db"  , rate:C.CONTROL, value:[ -6, -3, 0, +3, +6 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["LPZ1", "HPZ1", "Slope", "LPZ2", "HPZ2", "BPZ2", "BRZ2"], {
      ar: {
        ok: ["+in","audio"],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control"],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite(["Lag", "Lag2", "Lag3", "Ramp"], {
      ar: {
        ok: ["+in","audio", "lagTime",0.1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "lagTime",0.1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"     , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"lagTime", rate:C.AUDIO, value:[ 0, 0.5, 2.5 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"     , rate:C.AUDIO , value:unitTestSuite.in0 },
          { name:"lagTime", value:0.5 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"     , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"lagTime", value:0.5 },
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

    ugenTestSuite(["LagUD", "Lag2UD", "Lag3UD"], {
      ar: {
        ok: ["+in","audio", "lagTimeU",0.1, "lagTimeD",0.1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "lagTimeU",0.1, "lagTimeD",0.1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"      , rate:C.AUDIO , value:unitTestSuite.in0 },
          { name:"lagTimeU", rate:C.CONTROL, value:[ 0, 0.5, 2.5 ] },
          { name:"lagTimeD", rate:C.CONTROL, value:[ 0, 0.5, 2.5, 1 ] },
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

    ugenTestSuite("VarLag", {
      ar: {
        ok: ["+in","audio", "time",0.1, "curvature",0, "warp",5, "start",0],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "time",0.1, "curvature",0, "warp",5, "start",0],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"time"     , rate:C.CONTROL, value:[ 0, 0.5, 2.5 ] },
          { name:"curvature", rate:C.CONTROL, value:[ 0, 0.5, 2.5, 1 ] },
          { name:"warp"     , value:5 },
          { name:"start"    , value:0 },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
      }
    });

    ugenTestSuite("Slew", {
      ar: {
        ok: ["+in","audio", "up",1, "dn",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control", "up",1, "dn",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"up", rate:C.CONTROL, value:[ +1, +0.5, 0, -0.5, -1 ] },
          { name:"dn", rate:C.CONTROL, value:[ -1, -0.5, 0, +0.5, +1, +0.75 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
  });

});
