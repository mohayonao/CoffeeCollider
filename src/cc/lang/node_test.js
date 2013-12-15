define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var node = require("./node");
  var cc   = require("./cc");
  
  describe("lang/node.js", function() {
    var actual, expected;
    testTools.mock("lang");
    testTools.mock("instanceOfSynthDef", function() {
      return true;
    });
    before(function() {
      cc.lang.rootNode = cc.global.Group();
    });
    describe("node", function() {
      it("#play", function() {
        var n = new node.Node().play();
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/n_run", n.nodeId, true]
        ]);
      });
      it("#pause", function() {
        var n = new node.Node().pause();
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/n_run", n.nodeId, false]
        ]);
      });
      it("#stop", function() {
        var n = new node.Node().stop();
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/n_free", n.nodeId]
        ]);
      });
      it("#performWait", function() {
        var n = new node.Node();
        assert.isTrue(n.performWait());
        n.stop();
        assert.isFalse(n.performWait());
      });
    });
    describe("group", function() {
      it("create", function() {
        var g0 = cc.global.Group(cc.lang.rootNode, C.ADD_TO_TAIL);
        assert.isTrue(cc.instanceOfNode(g0));
        assert.isTrue(cc.instanceOfGroup(g0));
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g0.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId]
        ]);
        var g1 = cc.global.Group(cc.lang.rootNode, "addAfter");
        assert.isTrue(cc.instanceOfNode(g1));
        assert.isTrue(cc.instanceOfGroup(g1));
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g0.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId],
          ["/g_new", g1.nodeId, C.ADD_AFTER  , cc.lang.rootNode.nodeId]
        ]);
      });
    });
    describe("synth", function() {
      var params, def;
      before(function() {
        params = {
          names: ["f","g"], indices: [0,2], length: [2,1], values: [440,660,880],
        };
        def = {
          _defId: 10,
          specs: {
            params: params
          }
        };
      });
      it("create", function() {
        var s0 = cc.global.Synth(def, {f:100}, cc.lang.rootNode, C.ADD_TO_TAIL);
        assert.isTrue(cc.instanceOfNode(s0));
        assert.isTrue(cc.instanceOfSynth(s0));
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/s_new", s0.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId, def._defId, [0, 100]]
        ]);
        
        var s1 = cc.global.Synth(def, {f:100}, cc.lang.rootNode, "addAfter");
        assert.isTrue(cc.instanceOfNode(s1));
        assert.isTrue(cc.instanceOfSynth(s1));
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/s_new", s0.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId, def._defId, [0, 100]],
          ["/s_new", s1.nodeId, C.ADD_AFTER  , cc.lang.rootNode.nodeId, def._defId, [0, 100]]
        ]);
      });
      it("#set", function() {
        var s0 = cc.global.Synth(def);
        s0.set({f:200});
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/s_new", s0.nodeId, C.ADD_TO_HEAD, cc.lang.rootNode.nodeId, def._defId, []],
          ["/n_set", s0.nodeId, [0, 200]]
        ]);
      });
    });
    describe("interface", function() {
      it("Group.new", function() {
        var g = cc.global.Group();
        cc.instanceOfGroup(g);
      });
      it("Group.after", function() {
        var g = cc.global.Group.after();
        cc.instanceOfGroup(g);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g.nodeId, C.ADD_AFTER, cc.lang.rootNode.nodeId]
        ]);
      });
      it("Group.before", function() {
        var g = cc.global.Group.before();
        cc.instanceOfGroup(g);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g.nodeId, C.ADD_BEFORE, cc.lang.rootNode.nodeId]
        ]);
      });
      it("Group.head", function() {
        var g = cc.global.Group.head();
        cc.instanceOfGroup(g);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g.nodeId, C.ADD_TO_HEAD, cc.lang.rootNode.nodeId]
        ]);
      });
      it("Group.tail", function() {
        var g = cc.global.Group.tail();
        cc.instanceOfGroup(g);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/g_new", g.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId]
        ]);
      });
    });
    describe("private methods", function() {
      it("args2controls", function() {
        var params = {
          names: ["f","g"], indices: [0,2], length: [2,1], values: [440,660,880],
        };
        actual = node.args2controls(null, params);
        assert.deepEqual(actual, []);
        
        actual = node.args2controls({f:[20,'a',30],g:40,h:50}, params);
        assert.deepEqual(actual, [0, 20, 2, 40]);
        
        actual = node.args2controls({g:'a'}, params);
        assert.deepEqual(actual, []);
      });
    });
  });

});
