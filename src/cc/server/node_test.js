define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var cc = require("./cc");
  var node = require("./node");
  var Group = node.Group;
  var Synth = node.Synth;
  
  cc.server = {
    timeline: {
      push: function(func) { func(); }
    }
  };
  
  var walk = function(node) {
    if (node) {
      node.emit("end");
      if (node instanceof Group) {
        walk(node.headNode);
      }
      walk(node.nextNode);
    }
  };
  
  describe("node.js", function() {
    var rootNode, nodes, passed, passed_push;
    beforeEach(function() {
      rootNode = cc.server.rootNode = new Group();
      nodes = [];
      nodes[0] = new Synth(null, rootNode, null, C.ADD_TO_HEAD);
      nodes[1] = new Group(nodes[0], C.ADD_AFTER);
      nodes[2] = new Synth(null, nodes[1], null, C.ADD_AFTER);
      nodes[3] = new Synth(null, nodes[1], null, C.ADD_TO_HEAD);
      nodes[4] = new Group(nodes[3], C.ADD_AFTER);
      nodes[5] = new Synth(null, nodes[4], null, C.ADD_AFTER);
      nodes[6] = new Synth(null, nodes[4], null, C.ADD_TO_HEAD);
      nodes[7] = new Group(nodes[6], C.ADD_AFTER);
      nodes[8] = new Synth(null, nodes[7], null, C.ADD_AFTER);
      passed = [];
      passed_push = function(i) {
        return function() {
          passed.push(i);
        };
      };
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].on("end", passed_push(i));
      }
    });
    describe("graphFunction", function() {
      it("addToHead", function() {
        new Synth(null, nodes[1], null, C.ADD_TO_HEAD).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 1, 9, 3, 4, 6, 7, 8, 5, 2], passed);
      });
      it("do nothing - addToHead of a synth", function() {
        new Synth(null, nodes[0], null, C.ADD_TO_HEAD).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 1, 3, 4, 6, 7, 8, 5, 2], passed);
      });
      it("addToTail", function() {
        new Synth(null, nodes[1], null, C.ADD_TO_TAIL).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 1, 3, 4, 6, 7, 8, 5, 9, 2], passed);
      });
      it("no nothing - addToTail of a synth", function() {
        new Synth(null, nodes[2], null, C.ADD_TO_TAIL).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 1, 3, 4, 6, 7, 8, 5, 2], passed);
      });
      it("addAfter", function() {
        new Synth(null, nodes[0], null, C.ADD_AFTER).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 9, 1, 3, 4, 6, 7, 8, 5, 2], passed);
      });
      it("addBefore", function() {
        new Synth(null, nodes[0], null, C.ADD_BEFORE).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([9, 0, 1, 3, 4, 6, 7, 8, 5, 2], passed);
      });
      it("replace", function() {
        new Synth(null, nodes[6], null, C.REPLACE).on("end", passed_push(9));
        walk(rootNode);
        assert.deepEqual([0, 1, 3, 4, 9, 7, 8, 5, 2], passed);
      });
    });
    describe("doneAction", function() {
      var desc;
      it("0", function() {
        desc = "do nothing when the UGen is finished";
        nodes[1]._doneAction(0);
        assert.deepEqual([], passed, desc);
      });
      it("1", function() {
        desc = "pause the enclosing synth, but do not free it";
        nodes[1]._doneAction(1);
        assert.deepEqual([], passed, desc);
        assert.isFalse(nodes[1]._running, desc);
      });
      it("2", function() {
        desc = "free the enclosing synth";
        nodes[1]._doneAction(2);
        assert.deepEqual([1], passed, desc);
      });
      it("3", function() {
        desc = "free both this synth and the preceding node";
        nodes[1]._doneAction(3);
        assert.deepEqual([0, 1], passed, desc);
      });
      it("4", function() {
        desc = "free both this synth and the following node";
        nodes[1]._doneAction(4);
        assert.deepEqual([1, 2], passed, desc);
      });
      it("5", function() {
        desc = "free this synth; if the preceding node is a group then do g_freeAll on it, else free it";
        nodes[2]._doneAction(5);
        assert.deepEqual([1, 3, 4, 5, 2], passed, desc);
      });
      it("6", function() {
        desc = "free this synth; if the following node is a group then do g_freeAll on it, else free it";
        nodes[0]._doneAction(6);
        assert.deepEqual([0, 1, 3, 4, 5], passed, desc);
      });
      it("7", function() {
        desc = "free this synth and all preceding nodes in this group";
        nodes[2]._doneAction(7);
        assert.deepEqual([0, 1, 2], passed, desc);
      });
      it("8", function() {
        desc = "free this synth and all following nodes in this group";
        nodes[0]._doneAction(8);
        assert.deepEqual([0, 1, 2], passed, desc);
      });
      it("9", function() {
        desc = "free this synth and pause the preceding node";
        nodes[1]._doneAction(9);
        assert.deepEqual([1], passed, desc);
        assert.isFalse(nodes[0]._running);
      });
      it("10", function() {
        desc = "free this synth and pause the following node";
        nodes[1]._doneAction(10);
        assert.deepEqual([1], passed, desc);
        assert.isFalse(nodes[2]._running);
      });
      it("11", function() {
        desc = "free this synth and if the preceding node is a group then do g_deepFree on it, else free it";
        nodes[2]._doneAction(11);
        assert.deepEqual([1, 3, 4, 6, 7, 8, 5, 2], passed, desc);
      });
      it("12", function() {
        desc = "free this synth and if the following node is a group then do g_deepFree on it, else free it";
        nodes[0]._doneAction(12);
        assert.deepEqual([0, 1, 3, 4, 6, 7, 8, 5], passed, desc);
      });
      it("13", function() {
        desc = "free this synth and all other nodes in this group (before and after)";
        nodes[1]._doneAction(13);
        assert.deepEqual([0, 1, 2], passed, desc);
      });
      it("14", function() {
        desc = "free the enclosing group and all nodes within it (including this synth)";
        nodes[1]._doneAction(14);
        assert.deepEqual([1, 3, 4, 6, 7, 8, 5], passed, desc);
      });
    });
  });

});
