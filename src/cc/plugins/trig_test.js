define(function(require, exports, module) {
  "use strict";

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
          { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0   },
          { name:"dur", rate:C.AUDIO  , value:unitTestSuite.in1 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0   },
          { name:"dur", rate:C.CONTROL, value:unitTestSuite.in1 },
        ]
      }
    ]);

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
    ]);

    ugenTestSuite(["ZeroCrossing", "Timer"], {
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
          { name:"int", rate:C.AUDIO, value:unitTestSuite.in0 }
        ]
      }
    ]);

    ugenTestSuite("Phasor", {
      ar: ["trig",0, "rate",1, "start",0, "end",1, "resetPos",0],
      kr: ["trig",0, "rate",1, "start",0, "end",1, "resetPos",0],
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
    ]);
  });  

});
