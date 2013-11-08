define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");

  describe("fn.js", function() {
    describe("Fn", function() {
      it("none", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).multiCall(false).build();
        assert.equal(calc(1, 2, 3), 5);
        assert.isTrue(isNaN(calc()));
      });
      it("defaults", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0,opts").build();
        assert.equal(calc(10)   , 10);
        assert.equal(calc(10, 2), 20);
      });
      it("defaults with dict", function() {
        var calc = fn(function(val, mul, add, opts) {
          return val * mul + add - opts.sub;
        }).defaults("val=0,mul=1,add=0,opts={}").build();
        assert.equal(calc(10, {add:20, sub:5}), 25);
      });
      it("defaults without dict", function() {
        var calc = fn(function(val, mul, add, opts) {
          opts = opts || { sub:10 };
          return val * mul + add - opts.sub;
        }).defaults("val=0,mul=1,add=0").build();
        assert.equal(calc(10, {add:20, sub:5}), 20);
      });
      describe("multiCall", function() {
        var calc;
        before(function() {
          calc = fn(function(val, mul, add) {
            return val * mul + add;
          }).multiCall().build();
        });
        it("basis", function() {
          assert.deepEqual(calc(10, [1, 2], 0), [10, 20]);
        });
        it("issue-31", function() {
          var actual = calc(10, [1, 2], [[100,[1000]]]);
          assert.deepEqual(actual,
                           [ [ 110, [ 1010 ] ], [ 120, [ 1020 ] ] ]);
        });
      });
      it("multiCall without an array", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).multiCall().build();
        assert.deepEqual(calc(10, 1, 0), 10);
      });
      it("defaults * multiCall", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").multiCall(true).build();
        assert.deepEqual(calc(10, [1, 2]), [10, 20]);
      });
      it("defaults * multiCall without an array", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").multiCall(true).build();
        assert.deepEqual(calc(10, 1), 10);
      });
    });
    it("definePrototypeProperty", function() {
      fn.definePrototypeProperty(Array, "fn_test", function() {
        return "fn_test";
      });
      assert.equal([10].fn_test(), "fn_test");
    });
    it("setupBinaryOp", function() {
      cc.instanceOfUGen = function() {
        return false;
      };
      fn.setupBinaryOp(Number, "fn_test", function(b) {
        return this + b;
      });
      assert.equal((10).fn_test(5), 15);
      assert.deepEqual((10).fn_test([5]), [15]);

      cc.instanceOfUGen = function() {
        return true;
      };
      cc.createBinaryOpUGen = function(ugenSelector, a, b) {
        return [ ugenSelector, a, b ];
      };
      assert.deepEqual((10).fn_test(5), ["fn_test", 10, 5]);

      ops.UGEN_OP_ALIASES["__fn_test__"] = "fn_test";
      fn.setupBinaryOp(Number, "__fn_test__", function() {});
      
      assert.deepEqual((10).__fn_test__(5), ["fn_test", 10, 5]);
    });
  });

});
