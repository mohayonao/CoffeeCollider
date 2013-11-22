define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var emitter = require("./emitter");

  describe("common/emitter.js", function() {
    var e;
    beforeEach(function() {
      e = emitter.mixin({});
    });
    it("on", function() {
      var passed = 0;
      var cb = function() {
        passed++;
      };
      assert.isFalse(e.hasListeners("hello"));
      e.on("hello", cb);
      e.on("hello", cb);
      assert.isTrue(e.hasListeners("hello"));
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(passed, 4);
    });
    it("once", function() {
      var passed = 0;
      e.once("hello", function() {
        passed++;
      });
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(passed, 1);
    });
    it("off", function() {
      var passed = 0;
      var f1 = function() {
        throw "should not pass through";
      };
      var f2 = function() {
        throw "should not pass through";
      };
      var f3 = function() {
        passed++;
      };
      e.on("foo", f1);
      e.on("foo", f2);
      e.on("foo", f3);
      e.off("foo", f1);
      e.off("foo", f2);
      e.emit("foo");
      assert.equal(passed, 1);
      
      e.off();
      e.emit("foo");
      assert.equal(passed, 1);
    });
    it("off-once", function() {
      var passed = 0;
      var f1 = function() {
        throw "should not pass through";
      };
      var f2 = function() {
        throw "should not pass through";
      };
      var f3 = function() {
        passed++;
      };
      e.once("foo", f1);
      e.once("foo", f2);
      e.once("foo", f3);
      e.off("foo", f1);
      e.off("foo", f2);
      e.emit("foo");
      e.emit("foo");
      assert.equal(passed, 1);

      e.off("foo");
      e.emit("foo");
      assert.equal(passed, 1);
    });
    it("emit-with-args", function() {
      var passed = 0;
      e.on("hello", function(x) {
        assert.equal(10, x);
        passed += 1;
      });
      e.emit("hello", 10);
      assert.equal(passed, 1);
    });
  });

});
