define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc   = require("./cc");
  var node = require("./node");
  
  describe("lang/node.js", function() {
    var tl, actual, expected;
    before(function() {
      node.use();
      cc.lang = {
        pushToTimeline: function(cmd) {
          tl = cmd;
        },
        rootNode: cc.createGroup(),
      };
      cc.instanceOfSynthDef = function() {
        return true;
      };
    });
    beforeEach(function() {
      tl = null;
    });
    describe("node", function() {
      it("create", function() {
        var n = cc.createNode();
        assert.isTrue(cc.instanceOfNode(n));
      });
      it("#play", function() {
        var n = cc.createNode().play();
        assert.deepEqual(tl, ["/n_run", n.nodeId, true]);
      });
      it("#pause", function() {
        var n = cc.createNode().pause();
        assert.deepEqual(tl, ["/n_run", n.nodeId, false]);
      });
      it("#stop", function() {
        var n = cc.createNode().stop();
        assert.deepEqual(tl, ["/n_free", n.nodeId]);
      });
      it("#performWait", function() {
        var n = cc.createNode();
        assert.isTrue(n.performWait());
        n.stop();
        assert.isFalse(n.performWait());
      });
    });
    describe("group", function() {
      it("create", function() {
        var g0 = cc.createGroup(cc.lang.rootNode, 1);
        assert.isTrue(cc.instanceOfNode(g0));
        assert.isTrue(cc.instanceOfGroup(g0));
        assert.deepEqual(tl, ["/g_new", g0.nodeId, 1, cc.lang.rootNode.nodeId]);
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
        var s0 = cc.createSynth(cc.lang.rootNode, 1, def, {f:100});
        assert.isTrue(cc.instanceOfNode(s0));
        assert.isTrue(cc.instanceOfSynth(s0));
        assert.deepEqual(tl, ["/s_new", s0.nodeId, 1, cc.lang.rootNode.nodeId, def._defId, [0, 100]]);
      });
      it("#set", function() {
        var s0 = cc.createSynth(0, 0, def);
        s0.set();
        assert.isNull(tl);
        
        s0.set({f:200});
        // assert.deepEqual(tl, ["/n_set", s0.nodeId, [0, 200]]);
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
        assert.deepEqual(tl, ["/g_new", g.nodeId, C.ADD_AFTER, cc.lang.rootNode.nodeId]);
      });
      it("Group.before", function() {
        var g = cc.global.Group.before();
        cc.instanceOfGroup(g);
        assert.deepEqual(tl, ["/g_new", g.nodeId, C.ADD_BEFORE, cc.lang.rootNode.nodeId]);
      });
      it("Group.head", function() {
        var g = cc.global.Group.head();
        cc.instanceOfGroup(g);
        assert.deepEqual(tl, ["/g_new", g.nodeId, C.ADD_TO_HEAD, cc.lang.rootNode.nodeId]);
      });
      it("Group.tail", function() {
        var g = cc.global.Group.tail();
        cc.instanceOfGroup(g);
        assert.deepEqual(tl, ["/g_new", g.nodeId, C.ADD_TO_TAIL, cc.lang.rootNode.nodeId]);
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
