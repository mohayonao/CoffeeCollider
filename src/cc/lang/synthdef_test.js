define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var synthdef = require("./synthdef");

  describe("synthdef.js", function() {
    var actual, expected, tl, addToSynth;
    before(function() {
      synthdef.use();
      cc.setSynthDef = function(func) {
        addToSynth = func;
      };
      cc.createControl = function() {
        return {
          init: function(list) {
            if (!list.length) {
              return 0;
            }
            var a = {
              klassName: "Control",
              rate     : C.CONTROL,
              channels : [],
              inputs   : [],
              numOfOutputs: 2,
            };
            var b = {
              klassName: "OutputProxy",
              rate     : C.CONTROL,
              inputs      : [ a ],
              outputIndex : 0,
              numOfOutputs: 1,
            };
            var c = {
              klassName: "OutputProxy",
              rate     : C.CONTROL,
              inputs      : [ a ],
              outputIndex : 1,
              numOfOutputs: 1,
            };
            a.channels = [ b, c ];
            addToSynth(a);
            addToSynth(b);
            addToSynth(c);
            return [ b, c ];
          }
        };
      };
      cc.instanceOfOut = function(obj) {
        return obj.klassName === "Out";
      };
      cc.instanceOfOutputProxy = function(obj) {
        return obj.klassName === "OutputProxy";
      };
      cc.instanceOfMultiOutUGen = function(obj) {
        return !!obj.channels;
      };
      cc.lang = {
        pushToTimeline: function(cmd) {
          tl = cmd;
        },
      };
      cc.console = {
        warn: function(str) {
          cc.console.warn.result = str;
        }
      };
    });
    beforeEach(function() {
      tl = null;
      cc.console.warn.result = null;
    });
    it("create", function() {
      var def = cc.createSynthDef(function(){});
      assert.isTrue(cc.instanceOfSynthDef(def));
      assert.isFalse(cc.instanceOfSynthDef([]));
    });
    it("makeSynthDef", function() {
      var func = function(out, freq, opts) {
        assert.equal(out .klassName, "OutputProxy");
        assert.equal(freq.klassName, "OutputProxy");
        assert.deepEqual(opts, {phase:0, amp:0.5}, "opts is {phase:0, amp:0.5}");
        var a = {
          klassName: "SinOsc",
          rate     : C.AUDIO,
          tag      : "sin",
          inputs   : [ freq, 0 ],
          numOfOutputs: 1
        };
        var b = {
          klassName: "Out",
          rate     : C.AUDIO,
          inputs   : [ out, a ],
          numOfOutputs: 0
        };
        addToSynth(a);
        addToSynth(b);
      };
      var args = [ "out", "0", "freq", "440", "opts", '{"phase":1, "amp":0.5}' ];
      var tmpl = cc.createSynthDefTemplate(func, args);
      var def  = tmpl.build({phase:0});
      assert.deepEqual(def.specs, {
        consts : [ 0 ],
        defList: [
          [ "Control", C.CONTROL, 0, [             ], [ 1,1 ], ""    ],
          [ "SinOsc" , C.AUDIO  , 0, [ 0, 1, -1, 0 ], [ 2   ], "sin" ],
          [ "Out"    , C.AUDIO  , 0, [ 0, 0,  1, 0 ], [     ], ""    ],
        ],
        params: {
          names  : [ "out", "freq" ],
          indices: [ 0, 1 ],
          length : [ 1, 1 ],
          values : [ 0, 440 ],
        }
      }, "synthdef specs");
      assert.deepEqual(tl, [
        "/s_def", def._defId, JSON.stringify(def.specs)
      ]);
    });
    describe("private methods", function() {
      it("args2keyValues", function() {
        actual = synthdef.args2keyValues([]);
        assert.deepEqual(actual, {keys:[],vals:[]});
        
        actual = synthdef.args2keyValues(["a", "100", "b", "[200,300]"]);
        assert.deepEqual(actual, {keys:["a","b"],vals:["100","[200,300]"]});
      })
      it("args2params", function() {
        var args;

        args = {
          keys:["a","b","c"],
          vals:["100","200","300"]
        };
        actual = synthdef.args2params(args);
        assert.deepEqual(actual, {
          params: {
            names  : [ "a", "b", "c" ],
            indices: [ 0, 1, 2 ],
            length : [ 1, 1, 1 ],
            values : [ 100, 200, 300 ],
          },
          flatten: [ 100, 200, 300 ],
          opts   : null
        });
        assert.deepEqual(args.keys, ["a","b", "c"]);
        assert.deepEqual(args.vals, ["100","200","300"]);
        
        args = {
          keys:["a","b","c"],
          vals:["[100,200]","300",'{"a":[100]}']
        };
        actual = synthdef.args2params(args);
        assert.deepEqual(actual, {
          params: {
            names  : [ "a", "b" ],
            indices: [ 0, 2 ],
            length : [ 2, 1 ],
            values : [ [100, 200], 300 ],
          },
          flatten: [ 100, 200, 300 ],
          opts   : { a:[100] }
        });
        assert.deepEqual(args.keys, ["a","b"], "opts is removed");
        assert.deepEqual(args.vals, ["[100,200]","300"]);
        
        assert.throw(function() {
          synthdef.args2params({ keys:["a"], vals:["(->0)"] });
        }, TypeError, "SynthDefFunction's arguments should be a JSONable: (->0)");
        
        assert.throw(function() {
          synthdef.args2params({ keys:["a"], vals:["[100,200,[300]]"] });
        }, TypeError, "SynthDefFunction's arguments should be a constant number or an array that contains it.");
      });
      it("isValidDefArg", function() {
        assert.isTrue(synthdef.isValidDefArg(100)  , "a number is valid.");
        assert.isTrue(synthdef.isValidDefArg([100, 200]), "an array is valid.");
        assert.isFalse(synthdef.isValidDefArg([100, [200]]), "an array that contains un-numbers is not valid.");
        assert.isFalse(synthdef.isValidDefArg({}), "extra is not valid.");
      });
      it("reshapeArgs", function() {
        var shape   = [ [ 1 ], [ 2, 3 ], 4 ];
        var flatten = [ 10, 20, 30, 40 ];
        var actual  = synthdef.reshapeArgs(shape, flatten);
        assert.deepEqual(actual, [ [ 10 ], [ 20, 30 ], 40 ]);
      });
      it("getConstValues", function() {
        var list = [
          0,
          { inputs: [ 10, 20, 30 ] },
          { inputs: [ 40, "50", {"60":70}, [80,90] ] },
          { inputs: [ 15, 25, 35, 45 ] },
        ];
        actual = synthdef.getConstValues(list);
        assert.deepEqual(actual, [10,15,20,25,30,35,40,45]);
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
        actual = synthdef.topoSort([ a, b, c, d ]);
        assert.deepEqual(actual, [ d, c, b, a ], "recursive");
        assert.isString(cc.console.warn.result);
      });
      it("makeDefList", function() {
        var a, b, c, d, e, f, list, consts;
        consts = [ 0, 0.5, 440 ];
        a = {
          klassName: "SinOsc",
          rate     : C.AUDIO,
          tag      : "sin",
          inputs   : [ 440, 0 ],
          numOfOutputs: 1,
        };
        b = {
          klassName: "BopUGen",
          rate     : C.AUDIO,
          specialIndex: 2,
          inputs   : [ a, 0.5 ],
          numOfOutputs: 1,
        };
        c = {
          klassName: "Out",
          rate     : C.AUDIO,
          inputs   : [ 0, b ],
          numOfOutputs: 0,
        }
        list = [ a, b, c ];
        actual = synthdef.makeDefList(list, consts);
        assert.deepEqual(
          actual,
          [
            [ "SinOsc" , C.AUDIO, 0, [ -1, 2, -1, 0 ], [2], "sin" ],
            [ "BopUGen", C.AUDIO, 2, [  0, 0, -1, 1 ], [2], ""    ],
            [ "Out"    , C.AUDIO, 0, [ -1, 0,  1, 0 ], [ ], ""    ],
          ],
        "Out.ar(0, SinOsc.ar(440, 0) * 0.5)");

        consts = [];
        a = {
          klassName: "Control",
          rate     : C.CONTROL,
          channels : [],
          inputs   : [],
          numOfOutputs: 3,
        };
        b = {
          klassName: "OutputProxy",
          rate     : C.CONTROL,
          inputs      : [ a ],
          outputIndex : 0,
          numOfOutputs: 1,
        };
        c = {
          klassName: "OutputProxy",
          rate     : C.CONTROL,
          inputs      : [ a ],
          outputIndex : 1,
          numOfOutputs: 1,
        };
        d = {
          klassName: "OutputProxy",
          rate     : C.CONTROL,
          inputs      : [ a ],
          outputIndex : 2,
          numOfOutputs: 1,
        };
        e = {
          klassName: "SinOsc",
          rate     : C.AUDIO,
          inputs   : [ c, d ],
          numOfOutputs: 1
        };
        f = {
          klassName: "Out",
          rate     : C.AUDIO,
          inputs   : [ b, e ],
          numOfOutputs: 0
        }
        a.channels = [ b, c, d ];
        list = [ a, b, c, d, e, f ];
        actual = synthdef.makeDefList(list, consts);
        assert.deepEqual(
          actual,
          [
            [ "Control"    , C.CONTROL, 0, [            ], [ 1, 1, 1 ], "" ],
            [ "SinOsc"     , C.AUDIO  , 0, [ 0, 1, 0, 2 ], [ 2       ], "" ],
            [ "Out"        , C.AUDIO  , 0, [ 0, 0, 1, 0 ], [         ], "" ],
          ],
        "Out.ar(c0, SinOsc.ar(c1, c2))");
      });
    });
  });

});
