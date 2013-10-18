define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var Emitter = require("./emitter").Emitter;

  describe("emitter.js", function() {
    it("on", function() {
      var e = new Emitter();
      var passed = 0;
      e.on("hello", function() {
        passed++;
      });
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(4, passed);
    });
    it("once", function() {
      var e = new Emitter();
      var passed = 0;
      e.once("hello", function() {
        passed++;
      });
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(1, passed);
    });
    it("off", function() {
      var e = new Emitter();
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
      assert.equal(1, passed);
    });
    it("off-once", function() {
      var e = new Emitter();
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
      assert.equal(1, passed);
    });
    it("emit-with-args", function() {
      var e = new Emitter();
      var passed = 0;
      e.on("hello", function(x) {
        assert.equal(10, x);
        passed += 1;
      });
      e.emit("hello", 10);
      assert.equal(1, passed);
    });
  });

});
