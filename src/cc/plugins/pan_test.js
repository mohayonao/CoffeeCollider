define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var pan = require("./pan");
  
  describe("plugins/pan.js", function() {
    ugenTestSuite("Pan2", {
      ar: function() {
        var _in = ugenTestSuite.audio();
        var u = cc.global.Pan2.ar(_in, 0.25, 0.5);
        assert.isArray(u);
        assert.deepEqual(u[0].inputs[0].inputs, [_in, 0.25, 0.5]);
        assert.deepEqual(u[1].inputs[0].inputs, [_in, 0.25, 0.5]);

        assert.throws(function() {
          cc.global.Pan2.ar(0, 0.25, 0.5);
        });
      },
      kr: function() {
        var _in = ugenTestSuite.control();
        var u = cc.global.Pan2.kr(_in, 0.25, 0.5);
        assert.isArray(u);
        assert.deepEqual(u[0].inputs[0].inputs, [_in, 0.25, 0.5]);
        assert.deepEqual(u[1].inputs[0].inputs, [_in, 0.25, 0.5]);
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"   , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"pos"  , rate:C.AUDIO  , value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
          { name:"level", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ],
        outputs: 2
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"   , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"pos"  , rate:C.CONTROL, value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
          { name:"level", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ],
        outputs: 2
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });

    ugenTestSuite("XFade2", {
      ar: {
        ok: ["+inA","audio", "+inB","audio", "pan",0, "level",1],
        ng: [
          ["+inA","control", "+inB","audio"],
          ["+inA","audio"  , "+inB","control"],
        ]
      },
      kr: ["+inA","control", "+inB","control", "pan",0, "level",1],
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
          { name:"pos"  , rate:C.AUDIO  , value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
          { name:"level", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ]
      },
      { rate: C.AUDIO,
        inputs: [
          { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
          { name:"pos"  , rate:C.CONTROL, value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
          { name:"level", rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
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

    ugenTestSuite("LinXFade2", {
      ar: {
        ok: ["+inA","audio","+inB","audio", "pan",0, "-level",1],
        ng: [
          ["inA","control", "inB","audio"  ],
          ["inA","audio"  , "inB","control"],
        ]
      },
      kr: {
        kr: ["+inA","control", "+inB","control", "pan",0, "-level",1],
      }
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
          { name:"pos"  , rate:C.AUDIO  , value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
        ]
      },
      { rate: C.AUDIO,
        inputs: [
          { name:"inA"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"inB"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
          { name:"pos"  , rate:C.CONTROL, value:[ -1, 0.5, 0, 0, 0.5, 1 ] },
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
