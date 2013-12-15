define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var synthdef = require("./synthdef");
  var cc = require("./cc");
  
  var IR = 0, TR = 1, KR = 2, AR = 3;
  var kr = C.CONTROL, ar = C.AUDIO;
  
  var Control = (function() {
    function Control(klassName, rate) {
      this.klassName = klassName;
      this.rate = rate;
      this.channels = [];
      this.inputs   = [];
      this.numOfOutputs = 0;
    };
    Control.prototype.init = function(values, lags) {
      lags = Array.isArray(lags) ? lags : [];
      this.channels = values.map(function(value, index) {
        return {
          klassName: this.klassName,
          rate     : this.rate,
          value    : value,
          index    : index,
          lag      : lags[index]||0
        };
      }, this);
      this.numOfOutputs = values.length;
      return this.channels.length === 1 ? this.channels[0] : this.channels;
    };
    return Control;
  })();
  
  describe("lang/synthdef.js", function() {
    var actual, expected;
    var addToSynth;
    
    testTools.mock("lang");
    testTools.mock("createTrigControl", function() {
      return new Control("TrigControl", C.CONTROL);
    });
    testTools.mock("createAudioControl", function() {
      return new Control("AudioControl", C.AUDIO);
    });
    testTools.mock("createLagControl", function() {
      return new Control("LagControl", C.CONTROL);
    });
    testTools.mock("createControl", function(rate) {
      return new Control("Control", rate);
    });
    testTools.mock("instanceOfNode", function() {
      return true;
    });
    testTools.mock("instanceOfControlUGen", function(obj) {
      return /Control$/.test(obj.klassName);
    });
    testTools.mock("instanceOfOut", function(obj) {
      return obj.klassName === "Out";
    });
    testTools.mock("instanceOfOutputProxy", function(obj) {
      return obj.klassName === "OutputProxy";
    });
    testTools.mock("global.Synth", function(def, args, target, action) {
      return [def, args, target, action];
    });
    testTools.mock("setSynthDef", function(func) {
      addToSynth = func;
    });
    
    describe("private methods", function() {
      it("initBuild", function() {
        var that = {};
        synthdef.initBuild(that);
        addToSynth(10);
        assert.deepEqual(that, { _children: [ 10 ], _args: [] });
      });
      it("finishBuild", function() {
        var that = { _args:[], _children:[] };
        synthdef.finishBuild(that);
        assert.isNull(addToSynth);
      });
      it("args2keyValues", function() {
        actual = synthdef.args2keyValues([]);
        assert.deepEqual(actual, {keys:[],vals:[]});
        
        actual = synthdef.args2keyValues(["a", "100", "b", "[200,300]"]);
        assert.deepEqual(actual, {keys:["a","b"],vals:["100","[200,300]"]});
      });
      it("args2controls", function() {
        actual   = synthdef.args2controls([], [], 0);
        expected = [];
        assert.deepEqual(actual, expected);

        var args  = [ "a", 10, "b", 20, "c", 30, "d", 40 ];
        var rates = ["ir", "tr", "ar", 0.5 ];
        actual   = synthdef.args2controls(args, rates, 0);
        expected = [
          {index:0, name:"a", type:IR, value:10, lag:0 },
          {index:1, name:"b", type:TR, value:20, lag:0 },
          {index:2, name:"c", type:AR, value:30, lag:0 },
          {index:3, name:"d", type:KR, value:40, lag:0.5 },
        ];
        assert.deepEqual(actual           , expected);
      });
      it("checkValidArgs", function() {
        var vals = [ 0, 1, [2, 3], null, undefined];
        assert.isTrue(synthdef.checkValidArgs(vals));
        
        assert.throws(function() {
          synthdef.checkValidArgs(["bad"]);
        });
        assert.throws(function() {
          synthdef.checkValidArgs( [0, 1, [2, [3]]] );
        });
      });
      it("keyValueRates2args", function() {
        var keys, vals, rates;
        
        keys = vals = rates = [];
        actual   = synthdef.keyValueRates2args(keys, vals, rates);
        expected = [];
        assert.deepEqual(actual, expected);

        keys  = [ "a", "b", "c", "d"   ];
        vals  = [ 10, [20, 30], 40, 50 ];
        rates = [ "ir", "tr", "ar", 1  ];
        actual   = synthdef.keyValueRates2args(keys, vals, rates);
        expected = [
          {index:0, name:"a", type:IR, value:10, lag:0 },
          {index:1, name:"b", type:TR, value:[20, 30], lag:0 },
          {index:2, name:"c", type:AR, value:40, lag:0 },
          {index:3, name:"d", type:KR, value:50, lag:1 },
        ];
        assert.deepEqual(actual, expected);
        
        keys  = [ "i_X", "t_X", "a_X", "k_X", "trig" ];
        vals  = [ 10, [20, 30], 40, 50, 60 ];
        rates = [];
        actual   = synthdef.keyValueRates2args(keys, vals, rates);
        expected = [
          {index:0, name:"i_X" , type:IR, value:10, lag:0 },
          {index:1, name:"t_X" , type:TR, value:[20, 30], lag:0 },
          {index:2, name:"a_X" , type:AR, value:40, lag:0 },
          {index:3, name:"k_X" , type:KR, value:50, lag:0 },
          {index:4, name:"trig", type:TR, value:60, lag:0 },
        ];
        assert.deepEqual(actual, expected);
      });
      it("controls2args", function() {
        var controls;
        controls = [];
        actual   = synthdef.controls2args(controls);
        expected = [];
        assert.deepEqual(actual, expected);
        
        controls = [
          {index:0, name:"a", type:KR, value:0, lag:0 },
          {index:1, name:"b", type:KR, value:1, lag:0 },
          {index:2, name:"c", type:KR, value:2, lag:0 },
        ];
        actual   = synthdef.controls2args(controls);
        expected = [
          { klassName:'Control', rate:C.CONTROL, value:0, index:0, lag:0 },
          { klassName:'Control', rate:C.CONTROL, value:1, index:1, lag:0 },
          { klassName:'Control', rate:C.CONTROL, value:2, index:2, lag:0 },
        ];
        assert.deepEqual(actual, expected);
        
        controls = [
          {index:0, name:"a", type:IR, value:[1, 10], lag:0 },
          {index:1, name:"b", type:TR, value:[2, 20], lag:0 },
          {index:2, name:"c", type:AR, value:[3, 30], lag:0 },
          {index:3, name:"d", type:KR, value:[4, 40], lag:0.5 },
          {index:4, name:"e", type:KR, value:[5, 50], lag:0 },
          {index:5, name:"f", type:IR, value:100, lag:0 },
          {index:6, name:"g", type:TR, value:200, lag:0 },
          {index:7, name:"h", type:AR, value:300, lag:0 },
          {index:8, name:"i", type:KR, value:500, lag:0 },
        ];
        actual   = synthdef.controls2args(controls);
        expected = [
          [
            { klassName:"Control"     , rate:C.SCALAR , value: 1, index:0, lag:0 },
            { klassName:"Control"     , rate:C.SCALAR , value:10, index:1, lag:0 },
          ],
          [
            { klassName:"TrigControl" , rate:C.CONTROL, value: 2, index:0, lag:0 },
            { klassName:"TrigControl" , rate:C.CONTROL, value:20, index:1, lag:0 },
          ],
          [
            { klassName:"AudioControl", rate:C.AUDIO  , value: 3, index:0, lag:0 },
            { klassName:"AudioControl", rate:C.AUDIO  , value:30, index:1, lag:0 },
          ],
          [
            { klassName:"LagControl"  , rate:C.CONTROL, value: 4, index:0, lag:0.5 },
            { klassName:"LagControl"  , rate:C.CONTROL, value:40, index:1, lag:0.5 },
          ],
          [
            { klassName:"LagControl"  , rate:C.CONTROL, value: 5, index:2, lag:0 },
            { klassName:"LagControl"  , rate:C.CONTROL, value:50, index:3, lag:0 },
          ],
          { klassName:"Control"     , rate:C.SCALAR , value:100, index:2, lag:0 },
          { klassName:"TrigControl" , rate:C.CONTROL, value:200, index:2, lag:0 },
          { klassName:"AudioControl", rate:C.AUDIO  , value:300, index:2, lag:0 },
          { klassName:"LagControl"  , rate:C.CONTROL, value:500, index:4, lag:0 },
        ];
        assert.deepEqual(actual, expected);
      });
      describe("asJSON", function() {
        var name = "test", controls, children;
        beforeEach(function() {
          controls = [];
          children = [];
        });
        it("empty", function() {
          actual   = synthdef.asJSON(name, controls, children);
          expected = {
            name    : "test",
            consts  : [],
            params  : { names:[], indices:[], length:[], values:[] },
            defList : [],
            variants: {}
          };
          assert.deepEqual(actual, expected);
        });
        it("non args", function() {
          children[0] = {
            klassName   : "Freq",
            rate        : C.CONTROL,
            inputs      : [ 440 ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[1] = {
            klassName   : "SinOsc",
            rate        : C.AUDIO  ,
            inputs      : [ children[0], 0 ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[2] = {
            klassName   : "Out",
            rate        : C.AUDIO,
            inputs      : [ children[1] ],
            outputIndex : 0,
          };
          actual   = synthdef.asJSON(name, controls, children);
          expected = {
            name    : "test",
            consts  : [ 0, 440 ],
            params  : { names:[], indices:[], length:[], values:[] },
            defList : [
              [ "Freq"  , kr, 0, [ -1, 1        ], [ kr ] ],
              [ "SinOsc", ar, 0, [  0, 0, -1, 0 ], [ ar ] ],
              [ "Out"   , ar, 0, [  1, 0        ], [    ] ],
            ],
            variants: {}
          };
          assert.deepEqual(actual, expected);
        });
        it("with args", function() {
          children[0] = {
            klassName   : "TrigControl",
            rate        : C.CONTROL,
            inputs      : [ 1 ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[1] = {
            klassName: "OutputProxy",
            rate     : C.CONTROL,
            inputs   : [ children[0] ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[0].channels = [ children[1] ];
          
          children[2] = {
            klassName   : "Control",
            rate        : C.CONTROL,
            inputs      : [ 880, 882, 0.5 ],
            numOfOutputs: 2,
            outputIndex : 0,
          };
          children[3] = {
            klassName: "OutputProxy",
            rate     : C.CONTROL,
            inputs   : [ children[2] ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[4] = {
            klassName: "OutputProxy",
            rate     : C.CONTROL,
            inputs   : [ children[2] ],
            numOfOutputs: 1,
            outputIndex : 1,
          };
          children[5] = {
            klassName: "OutputProxy",
            rate     : C.CONTROL,
            inputs   : [ children[2] ],
            numOfOutputs: 2,
            outputIndex : 1,
          };
          children[2].channels = [ children[3], children[4], children[5] ];
          
          children[6] = {
            klassName   : "TSinOsc",
            rate        : C.AUDIO  ,
            inputs      : [ children[1], children[3], children[5] ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[7] = {
            klassName   : "TSinOsc",
            rate        : C.AUDIO  ,
            inputs      : [ children[1], children[4], children[5] ],
            numOfOutputs: 1,
            outputIndex : 0,
          };
          children[6] = {
            klassName   : "Out",
            rate        : C.AUDIO,
            inputs      : [ children[6], children[7] ],
            outputIndex : 0,
          };
          controls = [
            { index:0, name:"freq" , type:KR, value:[880, 882], lag:0 },
            { index:1, name:"phase", type:KR, value:0.5, lag:0 },
            { index:2, name:"trig" , type:TR, value:  1, lag:0 },
          ];
          actual   = synthdef.asJSON(name, controls, children);
          expected = {
            name  : "test",
            consts: [ 0.5, 1, 880, 882 ], 
            params: {
              names  : [ "freq", "phase", "trig" ],
              indices: [ 1, 3, 0 ],
              length : [ 2, 1, 1 ],
              values : [ 1, 880, 882, 0.5 ],
            },
            defList: [
              [ "Control"    , kr, 1, [ -1, 2, -1, 3, -1, 0 ], [ kr, kr, kr ] ],
              [ "TrigControl", kr, 0, [ -1, 1               ], [ kr         ] ],
              [ "TSinOsc"    , ar, 0, [  1, 0,  0, 1,  0, 1 ], [ ar         ] ],
              [ "TSinOsc"    , ar, 0, [  1, 0,  0, 0,  0, 1 ], [ ar         ] ],
              [ "Out"        , ar, 0, [  3, 0,  2, 0        ], [            ] ],
            ],
            variants: {}
          };
          assert.deepEqual(actual, expected);
        });
      });
      it("reshape", function() {
        var shape   = [ [ 1 ], [ 2, 3 ], 4 ];
        var flatten = [ 10, 20, 30, 40 ];
        var actual  = synthdef.reshape(shape, flatten);
        assert.deepEqual(actual, [ [ 10 ], [ 20, 30 ], 40 ]);
      });
      it("totoSort", function() {
        var a, b, c, d, list, saved, actual;
        
        // d c
        //  b   c
        //    a(OUT)
        a = {name:"a", klassName:"Out"}; b = {name:"b"}; c = {name:"c"}; d = {name:"d"};
        a.inputs = [ b, c ]; b.inputs = [ d, c ];
        actual = synthdef.topoSort([ a, b, c, d ]);
        assert.deepEqual(actual, [ c, d, b, a ]);

        // d  c
        // b  a
        a = {name:"a", klassName:"Out"}; b = {name:"b", klassName:"Out"}; c = {name:"c"}; d = {name:"d"};
        a.inputs = [ c ]; b.inputs = [ d ];
        actual = synthdef.topoSort([ a, b, c, d ]);
        assert.deepEqual(actual, [ d, c, a, b ]);
        
        // d c
        //  a(OUT)
        a = {name:"a", klassName:"Out"}; b = {name:"b"}; c = {name:"c"}; d = {name:"d"};
        a.inputs = [ d, c ];
        actual = synthdef.topoSort([ a, b, c, d ]);
        assert.deepEqual(actual, [ c, d, a ], "remove unused object");
        
        // d
        // c
        // b
        // a (not OUT)
        a = {name:"a"}; b = {name:"b"}; c = {name:"c"}; d = {name:"d"};
        a.inputs = [b]; b.inputs = [c]; c.inputs = [d];
        actual = synthdef.topoSort([ a, b, c, d ]);
        assert.deepEqual(actual, [], "none Out");
        
        // a (recursive)
        // d
        // c
        // b
        // a(OUT)
        a = {name:"a", klassName:"Out"}; b = {name:"b"}; c = {name:"c"}; d = {name:"d"};
        a.inputs = [b]; b.inputs = [c]; c.inputs = [d]; d.inputs = [a];
        assert.throws(function() {
          synthdef.topoSort([ a, b, c, d ]);
        }, "UGen graph contains recursion.");
      });
    });
    describe("SynthDef", function() {
      var def;
      it("create", function() {
        def = cc.global.SynthDef(function() {
        });
        assert.instanceOf(def, synthdef.SynthDef);
        assert.equal(def.name, "synth");
      });
      it("send", function() {
        def = new synthdef.SynthDef("test");
        def.specs = { consts:[-Infinity, Infinity] };
        actual   = def.send();
        expected = def;
        assert.equal(actual, expected);
        
        assert.deepEqual(
          cc.lang.pushToTimeline.result, [
            [ "/s_def", def._defId, JSON.stringify({consts:["-Infinity", "Infinity"]}) ]
          ]
        );
        
        cc.lang.pushToTimeline.result = [];
        def.send();
        assert.deepEqual(cc.lang.pushToTimeline.result, []);
      });
      it("play", function() {
        def = new synthdef.SynthDef("test");
        def.specs = { consts:[-Infinity, Infinity] };
        actual = def.play();
        assert.deepEqual(actual, [
          def, undefined, undefined, C.ADD_TO_HEAD
        ]);

        actual = def.play(0, {freq:440}, "addToTail");
        assert.deepEqual(actual, [
          def, {freq:440}, 0, C.ADD_TO_TAIL
        ]);
      });
    });
  });

});
