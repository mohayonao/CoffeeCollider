define(function(require, exports, module) {
  "use strict";

  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var range = require("./range");
  
  describe("plugins/range.js", function() {
    ugenTestSuite(["InRange", "Clip", "Fold", "Wrap"], {
      ar: ["+in","audio"  , "lo",0, "hi",1],
      kr: ["+in","control", "lo",0, "hi",1],
      ir: ["+in","scalar" , "lo",0, "hi",1],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"lo", rate:C.AUDIO, value:unitTestSuite.in1 },
          { name:"hi", rate:C.AUDIO, value:unitTestSuite.in2 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"in", rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"lo", rate:C.CONTROL, value:unitTestSuite.in1 },
          { name:"hi", rate:C.CONTROL, value:unitTestSuite.in2 },
        ]
      }
    ]);
  });

});
