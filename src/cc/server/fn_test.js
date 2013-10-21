define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var fn = require("./fn");

  describe("fn.js", function() {
    var Foo = (function() {
      function Foo() {}
      return Foo;
    })();
    var Bar = (function() {
      function Bar() {}
      fn.extend(Bar, Foo);
      return Bar;
    })();
    
    describe("Fn", function() {
      it("defaults", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").build();
        assert.equal(10, madd(10));
        assert.equal(20, madd(10, 2));
        assert.equal(30, madd(10, {add:20}));
      });
      it("multiCall", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).multiCall().build();
        assert.deepEqual([10, 20], madd(10, [1, 2], 0));
      });
      it("defaults * multiCall", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").multiCall().build();
        assert.deepEqual([10, 20], madd(10, [1, 2]));
      });
    });
    it("extend", function() {
      assert.instanceOf(new Bar(), Foo);
    });
  });
  
});
