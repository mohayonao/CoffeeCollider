define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var osc = require("./osc");
  
  describe("plugins/osc.js", function() {
    ugenTestSuite("FSinOsc", {
      ar: ["freq",440, "iphase",0],
      kr: ["freq",440, "iphase",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
          { name:"iphase", rate:C.SCALAR, value:0.5 },
        ]
      }
    ]);

    ugenTestSuite("SinOsc", {
      ar: ["freq",440, "phase",0],
      kr: ["freq",440, "phase",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.AUDIO, value:[ 0, 0, 0.5, 0.5 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.AUDIO  , value:[ 0, 0, 0.5, 0.5 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.CONTROL, value:[ 0, 0, 0.5, 0.5 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.CONTROL, value:[ 0, 0, 0.5, 0.5 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO , value:unitTestSuite.freq1 },
          { name:"phase", rate:C.SCALAR, value:0.5 },
        ]
      }
    ]);

    ugenTestSuite("SinOscFB", {
      ar: ["freq",440, "feedback",0],
      kr: ["freq",440, "feedback",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"    , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"feedback", rate:C.CONTROL, value:unitTestSuite.in0 },
        ]
      }
    ]);
    
    ugenTestSuite(["LFSaw", "LFPar", "LFCub", "LFTri"], {
      ar: ["freq",440, "iphase",0],
      kr: ["freq",440, "iphase",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"  , rate:C.AUDIO , value:unitTestSuite.freq1 },
          { name:"iphase", rate:C.SCALAR, value:0.5 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"iphase", rate:C.SCALAR , value:0.5 },
        ]
      }
    ]);

    ugenTestSuite("LFPulse", {
      ar: ["freq",440, "iphase",0, "width",0.5],
      kr: ["freq",440, "iphase",0, "width",0.5],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"  , rate:C.AUDIO  , value:unitTestSuite.freq1 },
          { name:"iphase", rate:C.SCALAR , value:0.5 },
          { name:"width" , rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"  , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"iphase", rate:C.SCALAR , value:0.5 },
          { name:"width" , rate:C.CONTROL, value:[ 0, 0.5, 1 ] },
        ]
      }
    ]);

    ugenTestSuite("Blip", {
      ar: ["freq",440, "numharm",200],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq"   , rate:C.AUDIO  , value:unitTestSuite.freq1 },
          { name:"numharm", rate:C.CONTROL, value:[ -10, 0, 10, 220, 10000 ] },
        ]
      }
    ]);

    ugenTestSuite("Saw", {
      ar: ["freq",440],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq", rate:C.AUDIO, value:unitTestSuite.freq1 },
        ]
      }
    ]);

    ugenTestSuite("Pulse", {
      ar: ["freq",440, "width",0.5],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO  , value:unitTestSuite.freq1 },
          { name:"width", rate:C.CONTROL, value:[ 0, 0.5, 1 ]}
        ]
      }
    ]);

    ugenTestSuite("Impulse", {
      ar: ["freq",440, "phase",0],
      kr: ["freq",440, "phase",0],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.AUDIO, value:[ 0, 0.5, 1 ]}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.AUDIO , value:unitTestSuite.freq1 },
          { name:"phase", rate:C.SCALAR, value:0}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.CONTROL, value:[ 0, 0.5, 1 ]}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"freq" , rate:C.CONTROL, value:unitTestSuite.freq1 },
          { name:"phase", rate:C.SCALAR , value:0}
        ]
      }
    ]);

    ugenTestSuite("SyncSaw", {
      ar: ["syncFreq",440, "sawFreq",440],
      kr: ["syncFreq",440, "sawFreq",440],
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"syncFreq", rate:C.AUDIO, value:unitTestSuite.freq0 },
          { name:"sawFreq" , rate:C.AUDIO, value:unitTestSuite.freq1}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"syncFreq", rate:C.AUDIO  , value:unitTestSuite.freq0 },
          { name:"sawFreq" , rate:C.CONTROL, value:unitTestSuite.freq1}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"syncFreq", rate:C.CONTROL, value:unitTestSuite.freq0 },
          { name:"sawFreq" , rate:C.AUDIO  , value:unitTestSuite.freq1}
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"syncFreq", rate:C.CONTROL, value:unitTestSuite.freq0 },
          { name:"sawFreq" , rate:C.CONTROL, value:unitTestSuite.freq1}
        ]
      },
    ]);

    ugenTestSuite("Select", {
      ar: function() {
        var in1 = ugenTestSuite.audio();
        var in2 = ugenTestSuite.audio();
        var u = cc.global.Select.ar(0, [in1, in2]);
        assert.equal(u.rate, C.AUDIO);
        assert.deepEqual(u.inputs, [0, in1, in2]);

        assert.throws(function() {
          cc.global.Select.ar(0, [in1, in2, 3]);
        });
      },
      kr: function() {
        var in1 = ugenTestSuite.audio();
        var in2 = ugenTestSuite.control();
        var u = cc.global.Select.kr(0, [in1, in2]);
        assert.equal(u.rate, C.CONTROL);
        assert.deepEqual(u.inputs, [0, in1, in2]);
      }
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"which", rate:C.AUDIO, value:[0,1,2,3] },
          { name:"in0"  , rate:C.AUDIO, value:unitTestSuite.in0 },
          { name:"in1"  , rate:C.AUDIO, value:unitTestSuite.in1 },
          { name:"in2"  , rate:C.AUDIO, value:unitTestSuite.in2 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"which", rate:C.CONTROL, value:[0,1,2,3] },
          { name:"in0"  , rate:C.AUDIO  , value:unitTestSuite.in0 },
          { name:"in1"  , rate:C.AUDIO  , value:unitTestSuite.in1 },
          { name:"in2"  , rate:C.AUDIO  , value:unitTestSuite.in2 },
        ]
      },
      { rate  : C.CONTROL,
        inputs: [
          { name:"which", rate:C.CONTROL, value:[0,1,2,3] },
          { name:"in0"  , rate:C.CONTROL, value:unitTestSuite.in0 },
          { name:"in1"  , rate:C.CONTROL, value:unitTestSuite.in1 },
          { name:"in2"  , rate:C.CONTROL, value:unitTestSuite.in2 },
        ]
      },
    ]);
  });

});
