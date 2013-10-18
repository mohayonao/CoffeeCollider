define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var cc = require("./cc");
  var node = require("./node");
  var Group = node.Group;
  var Synth = node.Synth;

  var walk = (function() {
    var walk = function(node, list) {
      if (list.length > 50) {
        throw "infinite loop??";
      }
      if (node) {
        if (node instanceof Group) {
          walk(node.head, list);
          walk(node.next, list);
        } else {
          list.push(node);
          walk(node.next, list);
        }
      }
      return list;
    };
    return function(root) {
      return walk(root, []);
    };
  })();

  cc.server = {
    timeline: {
      push: function(func) { func(); }
    }
  };
  
  describe("node.js", function() {
    var rootNode;
    beforeEach(function() {
      rootNode = cc.server.rootNode = new Group();
    });
    it("addToHead", function() {
      var nodes = [];
      for (var i = 0; i < 5; i++) {
        nodes[i] = new Synth(null, rootNode, null, C.ADD_TO_HEAD);
      }
      var expected = [ nodes[4], nodes[3], nodes[2], nodes[1], nodes[0] ];
      var actual = walk(rootNode);
      assert.deepEqual(expected, actual);
    });
    it("addToTail", function() {
      var nodes = [];
      for (var i = 0; i < 5; i++) {
        nodes[i] = new Synth(null, rootNode, null, C.ADD_TO_TAIL);
      }
      var expected = [ nodes[0], nodes[1], nodes[2], nodes[3], nodes[4] ];
      var actual = walk(rootNode);
      assert.deepEqual(expected, actual);
    });
    it("addAfter", function() {
      var nodes = [];
      nodes[0] = new Synth(null, rootNode, null, C.ADD_TO_HEAD);
      for (var i = 1; i < 5; i++) {
        nodes[i] = new Synth(null, nodes[0], null, C.ADD_AFTER);
      }
      var expected = [ nodes[0], nodes[4], nodes[3], nodes[2], nodes[1] ];
      var actual = walk(rootNode);
      assert.deepEqual(expected, actual);
    });
    it("addBefore", function() {
      var nodes = [];
      nodes[0] = new Synth(null, rootNode, null, C.ADD_TO_HEAD);
      for (var i = 1; i < 5; i++) {
        nodes[i] = new Synth(null, nodes[0], null, C.ADD_BEFORE);
      }
      var expected = [ nodes[1], nodes[2], nodes[3], nodes[4], nodes[0] ];
      var actual = walk(rootNode);
      assert.deepEqual(expected, actual);
    });
    it("replace", function() {
      var nodes = [];
      for (var i = 0; i < 5; i++) {
        nodes[i] = new Synth(null, rootNode, null, C.ADD_TO_HEAD);
      }
      nodes[5] = new Synth(null, nodes[0], null, C.REPLACE);
      nodes[6] = new Synth(null, nodes[4], null, C.REPLACE);
      nodes[7] = new Synth(null, nodes[2], null, C.REPLACE);
      var expected = [ nodes[6], nodes[3], nodes[7], nodes[1], nodes[5] ];
      var actual = walk(rootNode);
      assert.deepEqual(expected, actual);
    });
  });

});
