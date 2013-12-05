define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var trig = require("./trig");
  
  describe("plugins/trig.js", function() {
    ugenTestSuite(["Trig", "Trig1"], {
      ar: ["in",0, "dur",0.1],
      kr: ["in",0, "dur",0.1],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"dur", rate:C.AUDIO  , value:[ 0, 0.1, 0.25, 0.5 ] },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"dur", rate:C.CONTROL, value:[ 0, 0.1, 0.25, 0.5 ] },
        ]
      }
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= 0);
        assert.ok(statistics.max <= 1);
      }
    });

    ugenTestSuite(["Latch", "Gate"], {
      ar: ["in",0, "trig",0],
      kr: ["in",0, "trig",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0   },
          { name:"trig", rate:C.AUDIO, value:unitTestSuite.trig0 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0   },
          { name:"trig", rate:C.CONTROL, value:unitTestSuite.trig0 },
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
    
    ugenTestSuite(["PulseCount", "SetResetFF"], {
      ar: ["+trig","audio"  , "reset",0],
      kr: ["+trig","control", "reset",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"trig" , rate:C.AUDIO, value:unitTestSuite.trig0 },
          { name:"reset", rate:C.AUDIO, value:unitTestSuite.trig2 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"trig" , rate:C.CONTROL, value:unitTestSuite.trig0 },
          { name:"reset", rate:C.CONTROL, value:unitTestSuite.trig2 },
        ]
      },
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
      }
    });

    ugenTestSuite(["Peak", "RunningMin", "RunningMax"], {
      ar: ["+in","audio"  , "trig",0],
      kr: ["+in","control", "trig",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"  , rate:C.AUDIO, value:unitTestSuite.in0   },
          { name:"trig", rate:C.AUDIO, value:unitTestSuite.trig0 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in"  , rate:C.CONTROL, value:unitTestSuite.in0   },
          { name:"trig", rate:C.CONTROL, value:unitTestSuite.trig0 },
        ]
      },
    ], {
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
      }
    });
    
    ugenTestSuite("PulseDivider", {
      ar: ["trig",0, "div",2, "start",0],
      kr: ["trig",0, "div",2, "start",0],
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"trig" , rate:C.AUDIO, value:unitTestSuite.trig0 },
          { name:"div"  , rate:C.AUDIO, value:[0, 1, 2, 10, -10]  },
          { name:"start", rate:C.AUDIO, value:[0, 1, 2, 3, 4]     },
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

    ugenTestSuite(["ToggleFF"], {
      ar: {
        ok: ["+trig","audio"],
        ng: ["+trig","control"]
      },
      kr: {
        ok: ["+trig","control"],
        ng: ["+trig","audio"]
      }
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"trig", rate:C.AUDIO, value:unitTestSuite.in0 }
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
    
    ugenTestSuite(["ZeroCrossing", "Timer"], {
      ar: {
        ok: ["+in","audio"],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control"],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 }
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

    ugenTestSuite("Sweep", {
      ar: ["+trig","audio"  , "rate",1],
      kr: ["+trig","control", "rate",1],
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"trig", rate:C.AUDIO  , value:unitTestSuite.trig0 },
          { name:"rate", rate:C.CONTROL, value:unitTestSuite.in0 },
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
    
    ugenTestSuite("Phasor", {
      ar: ["+trig","audio"  , "rate",1, "start",0, "end",1, "resetPos",0],
      kr: ["+trig","control", "rate",1, "start",0, "end",1, "resetPos",0],
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"trig"    , rate:C.CONTROL, value:unitTestSuite.trig0 },
          { name:"rate"    , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"start"   , rate:C.CONTROL, value:[-1,-0.5,0,+0.5,+1] },
          { name:"end"     , rate:C.CONTROL, value:[+1,+0.5,0,-0.5,-1,-1] },
          { name:"resetPos", rate:C.CONTROL, value:[+0.5,0,-0.5] },
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
    
    ugenTestSuite("PeakFollower", {
      ar: ["+in","audio"  , "decay",0.999],
      kr: ["+in","control", "decay",0.999],
    }).unitTestSuite([
      { rate: C.AUDIO,
        inputs: [
          { name:"in"   , rate:C.AUDIO  , value:unitTestSuite.trig0 },
          { name:"decay", rate:C.CONTROL, value:unitTestSuite.in0 },
        ]
      }
    ], {
      checker: function(statistics) {
        console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        // assert.ok(statistics.min >= -1.0);
        // assert.ok(statistics.max <= +1.0);
      }
    });
    
  });  

});
