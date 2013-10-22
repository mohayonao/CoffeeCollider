define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var Emitter = require("./emitter").Emitter;

  describe("emitter.js", function() {
    var e;
    beforeEach(function() {
      e = Emitter.bind({});
    });
    it("on", function() {
      var actual = 0;
      e.on("hello", function() {
        actual++;
      });
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(actual, 4);
    });
    it("once", function() {
      var actual = 0;
      e.once("hello", function() {
        actual++;
      });
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      e.emit("hello");
      assert.equal(actual, 1);
    });
    it("off", function() {
      var actual = 0;
      var f1 = function() {
        throw "should not pass through";
      };
      var f2 = function() {
        throw "should not pass through";
      };
      var f3 = function() {
        actual++;
      };
      e.on("foo", f1);
      e.on("foo", f2);
      e.on("foo", f3);
      e.off("foo", f1);
      e.off("foo", f2);
      e.emit("foo");
      assert.equal(actual, 1);
    });
    it("off-once", function() {
      var actual = 0;
      var f1 = function() {
        throw "should not pass through";
      };
      var f2 = function() {
        throw "should not pass through";
      };
      var f3 = function() {
        actual++;
      };
      e.once("foo", f1);
      e.once("foo", f2);
      e.once("foo", f3);
      e.off("foo", f1);
      e.off("foo", f2);
      e.emit("foo");
      e.emit("foo");
      assert.equal(actual, 1);
    });
    it("emit-with-args", function() {
      var actual = 0;
      e.on("hello", function(x) {
        assert.equal(10, x);
        actual += 1;
      });
      e.emit("hello", 10);
      assert.equal(actual, 1);
    });
  });

});
