define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var node = require("./node");
  var Group = node.Group;
  var Synth = node.Synth;
  var ir = C.SCALAR, kr = C.CONTROL, ar = C.AUDIO;
  
  describe("server/node.js", function() {
    var actual, expected;
    var world, nodes, rootNode;
    var processed;
    
    testTools.mock("server", {
      timeline: {
        push: function(func) { func(); }
      },
      sendToLang: function() {}
    });
    
    beforeEach(function() {
      world = { defs:[] };
      world.nodes = [
        new Group(world, 0), new Synth(world, 1), new Group(world, 2), new Synth(world, 3), new Synth(world, 4),
        new Group(world, 5), new Synth(world, 6), new Synth(world, 7), new Group(world, 8), new Synth(world, 9),
      ];
      nodes    = world.nodes.slice();
      rootNode = nodes[0];
      nodes[0].head = nodes[1]; nodes[0].tail = nodes[3];
      nodes[1].parent = nodes[0]; nodes[1].next = nodes[2];
      nodes[2].parent = nodes[0]; nodes[2].prev = nodes[1]; nodes[2].next = nodes[3]; nodes[2].head = nodes[4]; nodes[2].tail = nodes[6];
      nodes[3].parent = nodes[0]; nodes[3].prev = nodes[2];
      nodes[4].parent = nodes[2]; nodes[4].next = nodes[5];
      nodes[5].parent = nodes[2]; nodes[5].prev = nodes[4]; nodes[5].next = nodes[6]; nodes[5].head = nodes[7]; nodes[5].tail = nodes[9];
      nodes[6].parent = nodes[2]; nodes[6].prev = nodes[5];
      nodes[7].parent = nodes[5]; nodes[7].next = nodes[8];
      nodes[8].parent = nodes[5]; nodes[8].prev = nodes[7]; nodes[8].next = nodes[9];
      nodes[9].parent = nodes[5]; nodes[9].prev = nodes[8];
      
      processed = [];
      nodes[1].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(1) }} ];
      nodes[3].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(3) }} ];
      nodes[4].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(4) }} ];
      nodes[6].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(6) }} ];
      nodes[7].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(7) }} ];
      nodes[9].unitList = [ {rate:{ bufLength:64 }, process:function() { processed.push(9) }} ];
    });
    
    var walk = (function() {
      var _walk = function(node, sort, list) {
        if (node) {
          list.push(node.nodeId);
          if (node instanceof Group) {
            if (sort === "DESC") {
              _walk(node.tail, sort, list);
            } else {
              _walk(node.head, sort, list);
            }
          }
          if (sort === "DESC") {
            _walk(node.prev, sort, list);
          } else {
            _walk(node.next, sort, list);
          }
        }
        return list;
      }
      return function(node, sort) { return _walk(node, sort, []); }
    })();

    describe("Node", function() {
      describe("#end", function() {
        it("nodes[0].end()", function() {
          nodes[0].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[0].running);
        });
        it("nodes[1].end()", function() {
          nodes[1].end();

          actual   = walk(rootNode, "ASC");
          expected = [ 0, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[1].running);
        });
        it("nodes[2].end()", function() {
          nodes[2].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[2].running);
        });
        it("nodes[3].end()", function() {
          nodes[3].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[3].running);
        });
        it("nodes[4].end()", function() {
          nodes[4].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[4].running);
        });
        it("nodes[5].end()", function() {
          nodes[5].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 4, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[5].running);
        });
        it("nodes[6].end()", function() {
          nodes[6].end();
          
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
          
          assert.isFalse(nodes[6].running);
        });
      });
    });
    describe("Group", function() {
      it("createRootNode", function() {
        var g = cc.createServerRootNode({});
        assert.instanceOf(g, Group);
        assert.equal(g.nodeId, 0);
      });
      it("createNode", function() {
        var g = cc.createServerGroup({}, 100, nodes[9], C.ADD_AFTER);
        assert.instanceOf(g, Group);
        assert.equal(g.nodeId, 100);
        
        actual   = walk(nodes[9], "ASC");
        expected = [ 9, 100 ];
        assert.deepEqual(actual, expected);
      });
      it("#process", function() {
        nodes[0].process(1);
        assert.deepEqual(processed, [ 1, 4, 7, 9, 6, 3 ]);
      });
    });
    describe("Synth", function() {
      testTools.mock("createUnit", function(synth, spec) {
        var u = {};
        u.specs     = spec;
        u.inputs    = new Array(spec[3].length >> 1);
        u.outputs   = [ [], [] ];
        u.inRates   = [];
        u.outRates  = spec[4];
        u.fromUnits = [];
        u.init = function() {
          if (spec[4].length) {
            u.process = function() {};
          }
        };
        return u;
      });
      it("createSynth", function() {
        var s = cc.createServerSynth({defs:[]}, 100, nodes[9], C.ADD_AFTER, 0, []);
        assert.instanceOf(s, Synth);
        assert.equal(s.nodeId, 100);
        
        actual   = walk(nodes[9], "ASC");
        expected = [ 9, 100 ];
        assert.deepEqual(actual, expected);
      });
      it("new with build", function() {
        world = {
          defs: [
            {
              name  : "test",
              consts: [ 0, 880 ], 
              params: {
                names  : [],
                indices: [],
                length : [],
                values : [],
              },
              defList: [
                [ "Scalar", ir, 0, [ -1, 1        ], [ ir ] ],
                [ "SinOsc", ar, 0, [  0, 0, -1, 0 ], [ ar ] ],
                [ "Pass"  , ar, 0, [  1, 0        ], [ ar ] ],
                [ "Out"   , ar, 0, [ -1, 0,  2, 0 ], [    ] ],
              ],
              variants: {},
              heapSize: 100
            }
          ],
          getFixNum: function(value) {
            return { outputs:[new Float32Array([value])] };
          }
        };
        var s = new Synth(world, 0, null, 0, 0, [0, 1, 1, 2]);
        assert.equal(s.unitList[0].inputs[0][0], 880);
        assert.equal(s.unitList[0].inRates[0], C.SCALAR);
        
        assert.equal(s.unitList[1].fromUnits[0], s.unitList[0]);
        assert.equal(s.unitList[1].inputs[0], s.unitList[0].outputs[0]);
        assert.equal(s.unitList[1].inputs[1][0], 0);
        assert.equal(s.unitList[1].inRates[0], C.SCALAR);
        assert.equal(s.unitList[1].inRates[1], C.SCALAR);
        
        assert.equal(s.unitList[2].fromUnits[0], s.unitList[1]);
        assert.equal(s.unitList[2].inputs[0], s.unitList[1].outputs[0]);
        assert.equal(s.unitList[2].inRates[0], C.AUDIO);
        
        assert.isUndefined(s.unitList[3]);
      });
      it("#set", function() {
        var s = new Synth({defs:[]}, 0);
        s.controls = [];
        s.set([0,1, 1,2, 2,3]);
        assert.deepEqual(s.controls, [ 1, 2, 3 ]);
      });
      it("#process", function() {
        nodes[4].process(1);
        assert.deepEqual(processed, [ 4, 7, 9, 6 ]);
      });
      it("#process (run:false)", function() {
        nodes[4].run(false);
        nodes[4].process(1);
        assert.deepEqual(processed, [ 7, 9, 6 ]);
      });
    });
    describe("graphFunction", function() {
      describe("addToHead", function() {
        it("first item", function() {
          new Synth(world, 10, nodes[8], C.ADD_TO_HEAD);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 10, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 10, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("subsequent item", function() {
          new Synth(world, 10, nodes[2], C.ADD_TO_HEAD);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 10, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to a synth", function() {
          new Synth(world, 10, nodes[9], C.ADD_TO_HEAD);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("addToTail", function() {
        it("first item", function() {
          new Synth(world, 10, nodes[8], C.ADD_TO_TAIL);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 10, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 10, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("subsequent item", function() {
          new Synth(world, 10, nodes[2], C.ADD_TO_TAIL);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 10, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to a synth", function() {
          new Synth(world, 10, nodes[9], C.ADD_TO_TAIL);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("addBefore", function() {
        it("append", function() {
          new Synth(world, 10, nodes[1], C.ADD_BEFORE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 10, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1, 10 ];
          assert.deepEqual(actual, expected);
        });
        it("insert", function() {
          new Synth(world, 10, nodes[3], C.ADD_BEFORE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 10, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to the root", function() {
          new Synth(world, 10, nodes[0], C.ADD_BEFORE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("addAfter", function() {
        it("append", function() {
          new Synth(world, 10, nodes[3], C.ADD_AFTER);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3, 10 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 10, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("insert", function() {
          new Synth(world, 10, nodes[1], C.ADD_AFTER);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 10, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to the root", function() {
          new Synth(world, 10, nodes[0], C.ADD_AFTER);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("replace", function() {
        it("replace a synth(head)", function() {
          new Synth(world, 10, nodes[1], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 10, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a synth(tail)", function() {
          new Synth(world, 10, nodes[3], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 10, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a group", function() {
          new Group(world, 10, nodes[2], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 10, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 10, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a root", function() {
          new Synth(world, 10, nodes[0], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
    });
    describe("doneAction", function() {
      var desc;
      it("0", function() {
        desc = "do nothing when the UGen is finished";
        nodes[2].doneAction(0);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("1", function() {
        desc = "pause the enclosing synth, but do not free it";
        nodes[2].doneAction(1);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);

        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("2", function() {
        desc = "free the enclosing synth";
        nodes[2].doneAction(2);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 3 ];
        assert.deepEqual(actual, expected, desc);

        actual   = walk(nodes[2], "ASC");
        expected = [ 2, 4, 5, 7, 8, 9, 6 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);

        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("3", function() {
        desc = "free both this synth and the preceding node";
        nodes[2].doneAction(3);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);

        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("3 (preceding node is not exists)", function() {
        desc = "free both this synth and the preceding node";
        nodes[1].doneAction(3);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);

        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("4", function() {
        desc = "free both this synth and the following node";
        nodes[2].doneAction(4);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("4 (following node is not exists)", function() {
        desc = "free both this synth and the following node";
        nodes[3].doneAction(4);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6 ];
        assert.deepEqual(actual, expected, desc);

        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("5", function() {
        desc = "free this synth; if the preceding node is a group then do g_freeAll on it, else free it";
        nodes[3].doneAction(5);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, false);
        assert.equal(nodes[5].running, false);
        assert.equal(nodes[6].running, false);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], null);
        assert.equal(world.nodes[5], null);
        assert.equal(world.nodes[6], null);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("5 (preceding is not a group)", function() {
        desc = "free this synth; if the preceding node is a group then do g_freeAll on it, else free it";
        nodes[2].doneAction(5);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 3 ];
        assert.deepEqual(actual, expected, desc);

        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("5 (preceding node is not exists)", function() {
        desc = "free this synth; if the preceding node is a group then do g_freeAll on it, else free it";
        nodes[1].doneAction(5);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("6", function() {
        desc = "free this synth; if the following node is a group then do g_freeAll on it, else free it";
        nodes[1].doneAction(6);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, false);
        assert.equal(nodes[5].running, false);
        assert.equal(nodes[6].running, false);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], null);
        assert.equal(world.nodes[5], null);
        assert.equal(world.nodes[6], null);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("6 (following is not a group)", function() {
        desc = "free this synth; if the following node is a group then do g_freeAll on it, else free it";
        nodes[2].doneAction(6);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("6 (following node is not exists)", function() {
        desc = "free this synth; if the following node is a group then do g_freeAll on it, else free it";
        nodes[3].doneAction(6);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("7", function() {
        desc = "free this synth and all preceding nodes in this group";
        nodes[3].doneAction(7);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("8", function() {
        desc = "free this synth and all following nodes in this group";
        nodes[1].doneAction(8);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("9", function() {
        desc = "free this synth and pause the preceding node";
        nodes[2].doneAction(9);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("9 (preceding node is not exists)", function() {
        desc = "free this synth and pause the preceding node";
        nodes[1].doneAction(9);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });      
      it("10", function() {
        desc = "free this synth and pause the following node";
        nodes[2].doneAction(10);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("10 (following node is not exists)", function() {
        desc = "free this synth and pause the preceding node";
        nodes[3].doneAction(10);

        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });      
      it("11", function() {
        desc = "free this synth and if the preceding node is a group then do g_deepFree on it, else free it";
        nodes[3].doneAction(11);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, false);
        assert.equal(nodes[5].running, false);
        assert.equal(nodes[6].running, false);
        assert.equal(nodes[7].running, false);
        assert.equal(nodes[8].running, false);
        assert.equal(nodes[9].running, false);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], null);
        assert.equal(world.nodes[5], null);
        assert.equal(world.nodes[6], null);
        assert.equal(world.nodes[7], null);
        assert.equal(world.nodes[8], null);
        assert.equal(world.nodes[9], null);
      });
      it("11 (preceding is not a group)", function() {
        desc = "free this synth and if the preceding node is a group then do g_deepFree on it, else free it";
        nodes[2].doneAction(11);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("11 (preceding node is not exists)", function() {
        desc = "free this synth and if the preceding node is a group then do g_deepFree on it, else free it";
        nodes[1].doneAction(11);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("12", function() {
        desc = "free this synth and if the following node is a group then do g_deepFree on it, else free it";
        nodes[1].doneAction(12);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, false);
        assert.equal(nodes[5].running, false);
        assert.equal(nodes[6].running, false);
        assert.equal(nodes[7].running, false);
        assert.equal(nodes[8].running, false);
        assert.equal(nodes[9].running, false);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], null);
        assert.equal(world.nodes[5], null);
        assert.equal(world.nodes[6], null);
        assert.equal(world.nodes[7], null);
        assert.equal(world.nodes[8], null);
        assert.equal(world.nodes[9], null);
      });
      it("12 (following is not a group)", function() {
        desc = "free this synth and if the following node is a group then do g_deepFree on it, else free it";
        nodes[2].doneAction(12);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("12 (following node is not exists)", function() {
        desc = "free this synth and if the following node is a group then do g_deepFree on it, else free it";
        nodes[3].doneAction(12);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("13", function() {
        desc = "free this synth and all other nodes in this group (before and after)";
        nodes[2].doneAction(13);

        actual   = walk(rootNode, "ASC");
        expected = [ 0 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
      it("14", function() {
        desc = "free the enclosing group and all nodes within it (including this synth)";
        nodes[2].doneAction(14);
        
        actual   = walk(rootNode, "ASC");
        expected = [ 0 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, false);
        assert.equal(nodes[1].running, false);
        assert.equal(nodes[2].running, false);
        assert.equal(nodes[3].running, false);
        assert.equal(nodes[4].running, false);
        assert.equal(nodes[5].running, false);
        assert.equal(nodes[6].running, false);
        assert.equal(nodes[7].running, false);
        assert.equal(nodes[8].running, false);
        assert.equal(nodes[9].running, false);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], null);
        assert.equal(world.nodes[2], null);
        assert.equal(world.nodes[3], null);
        assert.equal(world.nodes[4], null);
        assert.equal(world.nodes[5], null);
        assert.equal(world.nodes[6], null);
        assert.equal(world.nodes[7], null);
        assert.equal(world.nodes[8], null);
        assert.equal(world.nodes[9], null);
      });
      it("none", function() {
        nodes[2].doneAction(100);
        actual   = walk(rootNode, "ASC");
        expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
        assert.deepEqual(actual, expected, desc);
        
        assert.equal(nodes[0].running, true);
        assert.equal(nodes[1].running, true);
        assert.equal(nodes[2].running, true);
        assert.equal(nodes[3].running, true);
        assert.equal(nodes[4].running, true);
        assert.equal(nodes[5].running, true);
        assert.equal(nodes[6].running, true);
        assert.equal(nodes[7].running, true);
        assert.equal(nodes[8].running, true);
        assert.equal(nodes[9].running, true);
        
        assert.equal(world.nodes[0], nodes[0]);
        assert.equal(world.nodes[1], nodes[1]);
        assert.equal(world.nodes[2], nodes[2]);
        assert.equal(world.nodes[3], nodes[3]);
        assert.equal(world.nodes[4], nodes[4]);
        assert.equal(world.nodes[5], nodes[5]);
        assert.equal(world.nodes[6], nodes[6]);
        assert.equal(world.nodes[7], nodes[7]);
        assert.equal(world.nodes[8], nodes[8]);
        assert.equal(world.nodes[9], nodes[9]);
      });
    });
  });

});
