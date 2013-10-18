define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var cc = require("./cc");
  var node = require("./node");
  var Group = node.Group;
  var Synth = node.Synth;

  var walk = (function() {
    var walk = function(node, flag, list) {
      if (list.length > 50) {
        throw "inf loop??";
      }
      if (node) {
        if (node instanceof Group) {
          if (flag === "bwd") {
            walk(node.tail, flag, list);
            walk(node.prev, flag, list);
          } else {
            walk(node.head, flag, list);
            walk(node.next, flag, list);
          }
        } else {
          list.push(node);
          if (flag === "bwd") {
            walk(node.prev, flag, list);
          } else {
            walk(node.next, flag, list);
          }
        }
      }
      return list;
    };
    return function(root, flag) {
      return walk(root, flag, []);
    };
  })();

  describe.only("node.js", function() {
    var root, groups = [], synths = [];
    beforeEach(function() {
      root = new Group();
      for (var i = 0; i < 6; i++) {
        groups[i] = new Group();
        synths[i] = new Synth();
      }
    });
    describe("append", function() {
      it("addToHead", function() {
        // 5 -> 4 -> 3 -> 2 -> 1 -> 0
        for (var i = 0; i < synths.length; ++i) {
          root.append(synths[i], "addToHead");
        }
        assert.equal(root.head, synths[5], "root.head should point to synths[5]");
        assert.equal(root.tail, synths[0], "root.tail should point to synths[0]");
        assert.deepEqual(walk(root, "fwd"), [
          synths[5], synths[4], synths[3], synths[2], synths[1], synths[0]
        ]);
      });
      it("addToTail", function() {
        // 0 -> 1 -> 2 -> 3 -> 4 -> 5
        for (var i = 0; i < synths.length; ++i) {
          root.append(synths[i], "addToTail");
        }
        assert.equal(root.head, synths[0], "root.head should point to synths[0]");
        assert.equal(root.tail, synths[5], "root.tail should point to synths[5]");
        assert.deepEqual(walk(root, "fwd"), [
          synths[0], synths[1], synths[2], synths[3], synths[4], synths[5]
        ]);
      });
      it("addBefore", function() {
        // 0 -> 1 -> 2 -> 3 -> 4
        for (var i = 0; i < synths.length - 1; ++i) {
          root.append(synths[i], "addToTail");
        }
        // 0 (-> 5) -> 1 -> 2-> 3 -> 4
        synths[1].append(synths[5], "addBefore");
        assert.equal(root.head, synths[0], "root.head should point to synths[0]");
        assert.equal(root.tail, synths[4], "root.tail should point to synths[4]");
        assert.deepEqual(walk(root, "fwd"), [
          synths[0], synths[5], synths[1], synths[2], synths[3], synths[4]
        ]);
      });
      it("addAfter", function() {
        // 0 -> 1 -> 2 -> 3 -> 4
        for (var i = 0; i < synths.length - 1; ++i) {
          root.append(synths[i], "addToTail");
        }
        // 0 -> 1 -> 2 (-> 5) -> 3 -> 4
        synths[2].append(synths[5], "addAfter");
        assert.equal(root.head, synths[0], "root.head should point to synths[0]");
        assert.equal(root.tail, synths[4], "root.tail should point to synths[4]");
        assert.deepEqual(walk(root, "fwd"), [
          synths[0], synths[1], synths[2], synths[5], synths[3], synths[4]
        ]);
      });
    });
  });

});
