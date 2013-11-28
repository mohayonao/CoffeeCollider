define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var bufio = require("./bufio");
  
  describe("plugins/bufio.js", function() {
    var buffer_opts = {
      beforeEach: function() {
        unitTestSuite.instance = {
          buffers: [ null ]
        };
      },
      preProcess: function(i) {
        if (i === 0) {
          for (var j = this.allOutputs.length; j--; ) {
            this.allOutputs[j] = 0;
          }
        }
        if (i === 1) {
          unitTestSuite.instance.buffers[0] = {
            samples : new Float32Array(1024 * 4),
            channels: 4,
            frames  : 1024,
            sampleRate: 44100,
          };
        }
      }
    };
    
    ugenTestSuite("PlayBuf", {
      ar: function() {
        var u = cc.global.PlayBuf.ar(1);
        assert.equal(u.inputs[0].rate, C.AUDIO);
        assert.deepEqual(u.inputs[0].inputs, [0, 1, 1, 0, 0, 0]);

        u = cc.global.PlayBuf.ar(2, {
          bufnum    : 2,
          rate      : 3,
          trigger   : 4,
          startPos  : 5,
          loop      : 6,
          doneAction: 7,
        });
        assert.deepEqual(u[0].inputs[0].inputs, [2, 3, 4, 5, 6, 7]);
        
        assert.throw(function() {
          cc.global.PlayBuf.ar("not number");
        });
      },
      kr: function() {
        var u = cc.global.PlayBuf.kr(1);
        assert.equal(u.inputs[0].rate, C.CONTROL);
        assert.deepEqual(u.inputs[0].inputs, [0, 1, 1, 0, 0, 0]);
        
        u = cc.global.PlayBuf.kr(2, {
          bufnum    : 2,
          rate      : 3,
          trigger   : 4,
          startPos  : 5,
          loop      : 6,
          doneAction: 7,
        });
        assert.deepEqual(u[0].inputs[0].inputs, [2, 3, 4, 5, 6, 7]);

        assert.throw(function() {
          cc.global.PlayBuf.kr("not number");
        });
      },
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"    , value:0 },
          { name:"rate"      , value:1 },
          { name:"trigger"   , rate:C.CONTROL, value:unitTestSuite.trig0 },
          { name:"startPos"  , value:0 },
          { name:"loop"      , value:0 },
          { name:"doneAction", value:1 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"    , value:0 },
          { name:"rate"      , value:1 },
          { name:"trigger"   , rate:C.CONTROL, value:unitTestSuite.trig0 },
          { name:"startPos"  , value:0 },
          { name:"loop"      , value:0 },
          { name:"doneAction", value:1 },
        ],
        outputs: 2
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"    , value:0 },
          { name:"rate"      , value:1 },
          { name:"trigger"   , rate:C.CONTROL, value:unitTestSuite.trig0 },
          { name:"startPos"  , value:0 },
          { name:"loop"      , value:0 },
          { name:"doneAction", value:1 },
        ],
        outputs: 4
      },
    ], buffer_opts);
    
    ugenTestSuite("BufRd", {
      ar: function() {
        var u = cc.global.BufRd.ar(1);
        assert.equal(u.inputs[0].rate, C.AUDIO);
        assert.deepEqual(u.inputs[0].inputs, [0, 0, 1, 2]);

        u = cc.global.BufRd.ar(2, {
          bufnum       : 2,
          phase        : 3,
          loop         : 4,
          interpolation: 5,
        });
        assert.deepEqual(u[0].inputs[0].inputs, [2, 3, 4, 5]);
        
        assert.throw(function() {
          cc.global.BufRd.ar("not number");
        });
      },
      kr: function() {
        var u = cc.global.BufRd.kr(1);
        assert.equal(u.inputs[0].rate, C.CONTROL);
        assert.deepEqual(u.inputs[0].inputs, [0, 0, 1, 2]);
        
        u = cc.global.BufRd.kr(2, {
          bufnum       : 2,
          phase        : 3,
          loop         : 4,
          interpolation: 5,
        });
        assert.deepEqual(u[0].inputs[0].inputs, [2, 3, 4, 5]);
        
        assert.throw(function() {
          cc.global.BufRd.kr("not number");
        });
      },
    }).unitTestSuite([
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"       , value:0 },
          { name:"phase"        , rate:C.AUDIO, value:[ 0, 0.1, 0.2, 0.3, 0.4 ] },
          { name:"loop"         , value:0 },
          { name:"interpolation", value:0 },
        ]
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"       , value:0 },
          { name:"phase"        , rate:C.AUDIO, value:[ 0, 0.1, 0.2, 0.3, 0.4 ] },
          { name:"loop"         , value:0 },
          { name:"interpolation", value:1 },
        ],
        outputs: 2
      },
      { rate  : C.AUDIO,
        inputs: [
          { name:"bufnum"       , value:0 },
          { name:"phase"        , rate:C.AUDIO, value:[ 0, 0.1, 0.2, 0.3, 0.4 ] },
          { name:"loop"         , value:0 },
          { name:"interpolation", value:4 },
        ],
        outputs: 4
      },
    ], buffer_opts);
    
    ugenTestSuite("BufSampleRate", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);

    ugenTestSuite("BufRateScale", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);

    ugenTestSuite("BufFrames", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);

    ugenTestSuite("BufSamples", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);

    ugenTestSuite("BufDur", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);

    ugenTestSuite("BufChannels", {
      kr: ["bufnum",0]
    }).unitTestSuite([
      { rate  : C.CONTROL,
        inputs: [
          { name:"bufnum", value:0 },
        ]
      }
    ], buffer_opts);
    
  });

});
