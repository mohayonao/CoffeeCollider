define(function(require, exports, module) {
  "use strict";
  
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;

  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var delay = require("./delay");

  describe("plugins/delay.js", function() {
    ugenTestSuite(["Delay1", "Delay2"], {
      ar: {
        ok: ["+in","audio"],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control"],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"in", rate:C.CONTROL, value:unitTestSuite.in0 },
        ]
      },
    ]);
    
    ugenTestSuite(["DelayN", "DelayL", "DelayC"], {
      ar: {
        ok: ["+in","audio","maxdelaytime",0.2, "delaytime",0.2],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control","maxdelaytime",0.2, "delaytime",0.2],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"          , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"maxdelaytime", rate:C.SCALAR , value:0.25 },
          { name:"delaytime"   , rate:C.CONTROL, value:unitTestSuite.time0 },
        ]
      },
    ]);

    ugenTestSuite(["CombN", "CombL", "CombC", "AllpassN", "AllpassL", "AllpassC"], {
      ar: {
        ok: ["+in","audio","maxdelaytime",0.2, "delaytime",0.2, "decaytime",1],
        ng: ["+in","control"]
      },
      kr: {
        ok: ["+in","control","maxdelaytime",0.2, "delaytime",0.2, "decaytime",1],
        ng: ["+in","audio"]
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in"          , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"maxdelaytime", rate:C.SCALAR , value:0.25 },
          { name:"delaytime"   , rate:C.CONTROL, value:unitTestSuite.time0 },
          { name:"decaytime"   , rate:C.CONTROL, value:unitTestSuite.time1 },
        ]
      },
    ]);
  });

});
