define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var node = require("./node");
  var Group = node.Group;
  var Synth = node.Synth;
    
  describe("server/node.js", function() {
    var actual, expected;
    var nodes, rootNode;
    
    testTools.mock("server", {
      timeline: {
        push: function(func) { func(); }
      },
      sendToLang: function() {}
    });
    
    beforeEach(function() {
      nodes = [
        new Group(null, 0), new Synth(null, 1), new Group(null, 2), new Synth(null, 3), new Synth(null, 4),
        new Group(null, 5), new Synth(null, 6), new Synth(null, 7), new Group(null, 8), new Synth(null, 9),
      ];
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
    
    describe("graphFunction", function() {
      describe("addToHead", function() {
        it("first item", function() {
          new Synth(null, 10, nodes[8], C.ADD_TO_HEAD);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 10, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 10, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("subsequent item", function() {
          new Synth(null, 10, nodes[2], C.ADD_TO_HEAD);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 10, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to a synth", function() {
          new Synth(null, 10, nodes[9], C.ADD_TO_HEAD);
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
          new Synth(null, 10, nodes[8], C.ADD_TO_TAIL);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 10, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 10, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("subsequent item", function() {
          new Synth(null, 10, nodes[2], C.ADD_TO_TAIL);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 10, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to a synth", function() {
          new Synth(null, 10, nodes[9], C.ADD_TO_TAIL);
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
          new Synth(null, 10, nodes[1], C.ADD_BEFORE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 10, 1, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 1, 10 ];
          assert.deepEqual(actual, expected);
        });
        it("insert", function() {
          new Synth(null, 10, nodes[3], C.ADD_BEFORE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 10, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to the root", function() {
          new Synth(null, 10, nodes[0], C.ADD_BEFORE);
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
          new Synth(null, 10, nodes[3], C.ADD_AFTER);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 3, 10 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 10, 3, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("insert", function() {
          new Synth(null, 10, nodes[1], C.ADD_AFTER);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 10, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);

          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("add to the root", function() {
          new Synth(null, 10, nodes[0], C.ADD_AFTER);
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
          new Synth(null, 10, nodes[1], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 10, 2, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 2, 6, 5, 9, 8, 7, 4, 10 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a synth(tail)", function() {
          new Synth(null, 10, nodes[3], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 2, 4, 5, 7, 8, 9, 6, 10 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 10, 2, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a group", function() {
          new Group(null, 10, nodes[2], C.REPLACE);
          actual   = walk(rootNode, "ASC");
          expected = [ 0, 1, 10, 4, 5, 7, 8, 9, 6, 3 ];
          assert.deepEqual(actual, expected);
          
          actual   = walk(rootNode, "DESC");
          expected = [ 0, 3, 10, 6, 5, 9, 8, 7, 4, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("replace a root", function() {
          new Synth(null, 10, nodes[0], C.REPLACE);
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
