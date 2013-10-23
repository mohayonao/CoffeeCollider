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
    },
    sendToClient: function() {}
  };
  
  var walk = (function() {
    var _walk = function(node, list) {
      if (node) {
        list.push(node.nodeId);
        if (node instanceof Group) {
          _walk(node.head, list);
        }
        _walk(node.next, list);
      }
      return list;
    }
    return function(node) {
      return _walk(node, []);
    }
  })();
  
  describe("node.js", function() {
    var nodeId, rootNode, nodes;
    beforeEach(function() {
      nodeId = 0;
      nodes = [];
      nodes[0] = rootNode = cc.server.rootNode = new Group(nodeId++);
      nodes[1] = new Synth(nodeId++, 0, rootNode, null, C.ADD_TO_HEAD);
      nodes[2] = new Group(nodeId++, nodes[1], C.ADD_AFTER);
      nodes[3] = new Synth(nodeId++, 0, nodes[2], null, C.ADD_AFTER);
      nodes[4] = new Synth(nodeId++, 0, nodes[2], null, C.ADD_TO_HEAD);
      nodes[5] = new Group(nodeId++, nodes[4], C.ADD_AFTER);
      nodes[6] = new Synth(nodeId++, 0, nodes[5], null, C.ADD_AFTER);
      nodes[7] = new Synth(nodeId++, 0, nodes[5], null, C.ADD_TO_HEAD);
      nodes[8] = new Group(nodeId++, nodes[7], C.ADD_AFTER);
      nodes[9] = new Synth(nodeId++, 0, nodes[8], null, C.ADD_AFTER);
    });
    describe("graphFunction", function() {
      it("addToHead", function() {
        new Synth(nodeId++, 0, nodes[2], null, C.ADD_TO_HEAD);
        var expected = [0, 1, 2, 10, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("do nothing - addToHead of a synth", function() {
        new Synth(nodeId++, 0, nodes[1], null, C.ADD_TO_HEAD);
        var expected = [0, 1, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("addToTail", function() {
        new Synth(nodeId++, 0, nodes[2], null, C.ADD_TO_TAIL);
        var expected = [0, 1, 2, 4, 5, 7, 8, 9, 6, 10, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("no nothing - addToTail of a synth", function() {
        new Synth(nodeId++, 0, nodes[3], null, C.ADD_TO_TAIL);
        var expected = [0, 1, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("addAfter", function() {
        new Synth(nodeId++, 0, nodes[1], null, C.ADD_AFTER);
        var expected = [0, 1, 10, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("addBefore", function() {
        new Synth(nodeId++, 0, nodes[1], null, C.ADD_BEFORE);
        var expected = [0, 10, 1, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
      it("replace", function() {
        new Synth(nodeId++, 0, nodes[7], null, C.REPLACE);
        var expected = [0, 1, 2, 4, 5, 10, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected);
      });
    });
    describe("doneAction", function() {
      var desc;
      it("0", function() {
        desc = "do nothing when the UGen is finished";
        nodes[2].doneAction(0);
        var expected = [0, 1, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("1", function() {
        desc = "pause the enclosing synth, but do not free it";
        nodes[2].doneAction(1);
        var expected = [0, 1, 2, 4, 5, 7, 8, 9, 6, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
        assert.isFalse(nodes[2].running, desc);
      });
      it("2", function() {
        desc = "free the enclosing synth";
        nodes[2].doneAction(2);
        var expected = [0, 1, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("3", function() {
        desc = "free both this synth and the preceding node";
        nodes[2].doneAction(3);
        var expected = [0, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("4", function() {
        desc = "free both this synth and the following node";
        nodes[2].doneAction(4);
        var expected = [0, 1];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("5", function() {
        desc = "free this synth; if the preceding node is a group then do g_freeAll on it, else free it";
        nodes[3].doneAction(5);
        var expected = [0, 1];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("6", function() {
        desc = "free this synth; if the following node is a group then do g_freeAll on it, else free it";
        nodes[1].doneAction(6);
        var expected = [0, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("7", function() {
        desc = "free this synth and all preceding nodes in this group";
        nodes[3].doneAction(7);
        var expected = [0];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("8", function() {
        desc = "free this synth and all following nodes in this group";
        nodes[1].doneAction(8);
        var expected = [0];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("9", function() {
        desc = "free this synth and pause the preceding node";
        nodes[2].doneAction(9);
        var expected = [0, 1, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
        assert.isFalse(nodes[1].running);
      });
      it("10", function() {
        desc = "free this synth and pause the following node";
        nodes[2].doneAction(10);
        var expected = [0, 1, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
        assert.isFalse(nodes[3].running);
      });
      it("11", function() {
        desc = "free this synth and if the preceding node is a group then do g_deepFree on it, else free it";
        nodes[3].doneAction(11);
        var expected = [0, 1];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("12", function() {
        desc = "free this synth and if the following node is a group then do g_deepFree on it, else free it";
        nodes[1].doneAction(12);
        var expected = [0, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("13", function() {
        desc = "free this synth and all other nodes in this group (before and after)";
        nodes[2].doneAction(13);
        var expected = [0];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
      it("14", function() {
        desc = "free the enclosing group and all nodes within it (including this synth)";
        nodes[2].doneAction(14);
        var expected = [0, 1, 3];
        var actual = walk(rootNode);
        assert.deepEqual(actual, expected, desc);
      });
    });
  });

});
