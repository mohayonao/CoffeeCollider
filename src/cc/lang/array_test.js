define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc  = require("./cc");
  var ops = require("../common/ops");
  var array = require("./array");
  
  var NumberHacker = (function() {
    function NumberHacker(selector, func) {
      this.selector  = selector;
      this.saved = Number.prototype[selector];
      Object.defineProperty(Number.prototype, selector, {
        configurable: true,
        enumerable  : false,
        writable    : true,
        value       : func
      });
    };
    NumberHacker.prototype.revert = function() {
      if (this.saved) {
        Object.defineProperty(Number.prototype, this.selector, {
          configurable: true,
          enumerable  : false,
          writable    : true,
          value       : this.saved
        });
      } else {
        delete Number.prototype[this.selector];
      }
    };
    return NumberHacker;
  })();
  
  describe("lang/array.js", function() {
    var actual, expected;
    before(function() {
      ops.UNARY_OP_UGEN_MAP.push("??array_test??");
      // require("./number");
  
    });
    describe("instance methods", function() {
      describe("common", function() {
        before(function() {
          cc.instanceOfUGen = function() {
            return false;
          };
        });
        it("instance methods", function() {
          var funcs;
          funcs = ops.UNARY_OP_UGEN_MAP.concat(ops.BINARY_OP_UGEN_MAP);
          funcs = funcs.concat(Object.keys(ops.COMMON_FUNCTIONS));
          funcs.forEach(function(selector) {
            if (!/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
              return;
            }
            var a = [ 1, 2, 3, 4, 5 ];
            var passed = 0;
            var h = new NumberHacker(selector, function() {
              passed += 1;
              return this;
            });
            var b = a[selector]();
            assert.deepEqual(a, b);
            assert.equal(passed, a.length);
            h.revert();
          });
        });
        describe("adverb", function() {
          var h;
          before(function() {
            h = new NumberHacker("max", function(b) {
              return Math.max(this, b);
            });
          });
          after(function() {
            h.revert();
          });
          it("scalar", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max(0);
            expected = [  0,  0,  0,  1,  2 ];
            assert.deepEqual(actual, expected);
          });
          it("wrap a == b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0, -1, -2]);
            expected = [  2,  1,  0,  1,  2 ];
            assert.deepEqual(actual, expected);
          });
          it("wrap a < b", function() {
            actual   = [ -2, -1,  0 ].max([2, 1, 0, -1, -2]);
            expected = [  2,  1,  0,  -1,  -1 ];
            assert.deepEqual(actual, expected);
          });
          it("wrap a > b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0]);
            expected = [  2,  1,  0,  2,  2 ];
            assert.deepEqual(actual, expected);
          });
          it("short a == b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0, -1, -2], C.SHORT);
            expected = [  2,  1,  0,  1,  2 ];
            assert.deepEqual(actual, expected);
          });
          it("short a < b", function() {
            actual   = [ -2, -1,  0 ].max([2, 1, 0, -1, -2], C.SHORT);
            expected = [  2,  1,  0 ];
            assert.deepEqual(actual, expected);
          });
          it("short a > b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0], C.SHORT);
            expected = [  2,  1,  0 ];
            assert.deepEqual(actual, expected);
          });
          it("fold a == b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0, -1, -2], C.FOLD);
            expected = [  2,  1,  0,  1,  2 ];
            assert.deepEqual(actual, expected);
          });
          it("fold a < b", function() {
            actual   = [ -2, -1,  0 ].max([2, 1, 0, -1, -2], C.FOLD);
            expected = [  2,  1,  0, -1, -2 ];
            assert.deepEqual(actual, expected);
          });
          it("fold a > b", function() {
            actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0], C.FOLD);
            expected = [  2,  1,  0, +1, +2 ];
            assert.deepEqual(actual, expected);
          });
          it("table", function() {
            actual   = [ -2, -1, +0, +1, +2 ].max([0, 1], C.TABLE);
            expected = [ [ 0, 1 ], [ 0, 1 ], [ 0, 1 ], [ 1, 1 ], [ 2, 2 ] ];
            assert.deepEqual(actual, expected);
          });
          it("flat", function() {
            actual   = [ -2, -1, +0, +1, +2 ].max([0, 1], C.FLAT);
            expected = [ 0, 1, 0, 1, 0, 1, 1, 1, 2, 2 ];
            assert.deepEqual(actual, expected);
          });
        });
      });
      describe("logic", function() {
        before(function() {
          cc.createTaskWaitLogic = function(logic, list) {
            return [logic].concat(list);
          };
        });
        it("__and__", function() {
          assert.deepEqual([1,2].__and__(3), ["and", 1, 2, 3]);
        });
        it("__or__", function() {
          assert.deepEqual([1,2].__or__(3), ["or", 1, 2, 3]);
        });
      });
      describe("ugen", function() {
        before(function() {
          cc.instanceOfUGen = function() {
            return true;
          };
          cc.createBinaryOpUGen = function(selector, a, b) {
            return [selector, a, b];
          };
        });
        it("ugen", function() {
          actual   = [1, 2].max(0);
          expected = [ [ "max", 1, 0 ], [ "max", 2, 0 ] ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("others", function() {
        var list = [ 1, -2, 3, -5, 8, -13 ];
        it("size", function() {
          assert.equal(list.size(), list.length);
        });
        it("minItem", function() {
          assert.equal(list.minItem(), -13);
        });
        it("minValue", function() {
          assert.equal(list.minValue(), -13);
        });
        it("maxItem", function() {
          assert.equal(list.maxItem(), 8);
        });
        it("maxValue", function() {
          assert.equal(list.maxValue(), 8);
        });
        it("at", function() {
          assert.isUndefined(list.at(-9));
          assert.isUndefined(list.at(-2));
          assert.equal(list.at(3), -5);
          assert.isUndefined(list.at( 7));
          assert.isUndefined(list.at(12));
        });
        it("clipAt", function() {
          assert.equal(list.clipAt(-9),  1);
          assert.equal(list.clipAt(-2),  1);
          assert.equal(list.clipAt( 3), -5);
          assert.equal(list.clipAt( 7), -13);
          assert.equal(list.clipAt(12), -13);
        });
        it("wrapAt", function() {
          assert.equal(list.wrapAt(-9), -5);
          assert.equal(list.wrapAt(-2),  8);
          assert.equal(list.wrapAt( 3), -5);
          assert.equal(list.wrapAt( 7), -2);
          assert.equal(list.wrapAt(12), 1);
        });
        it("foldAt", function() {
          assert.equal(list.foldAt(-9), -2);
          assert.equal(list.foldAt(-2),  3);
          assert.equal(list.foldAt( 3), -5);
          assert.equal(list.foldAt( 7), -5);
          assert.equal(list.foldAt(12),  3);
        });
      });
    });
    describe("class methods", function() {
      it(".series", function() {
        actual   = Array.series(10);
        expected = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ];
        assert.deepEqual(actual, expected);

        actual   = Array.series(10, 100, 50);
        expected = [ 100, 150, 200, 250, 300, 350, 400, 450, 500, 550 ];
        assert.deepEqual(actual, expected);
      });
      it(".geom", function() {
        actual   = Array.geom(10);
        expected = [ 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 ];
        assert.deepEqual(actual, expected);

        actual   = Array.geom(10, 1, 0.5);
        expected = [ 1, 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625, 0.0078125, 0.00390625, 0.001953125 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it(".fill", function() {
        actual   = Array.fill(10);
        expected = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
        assert.deepEqual(actual, expected);
        
        actual   = Array.fill(10, 1);
        expected = [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ];
        assert.deepEqual(actual, expected);

        actual   = Array.fill(10, function(i) {
          return i * 100;
        });
        expected = [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900 ];
        assert.deepEqual(actual, expected);
      });
      it(".fill2D", function() {
        actual   = Array.fill2D(3, 3);
        expected = [ [0, 0, 0], [0, 0, 0], [0, 0, 0] ];
        assert.deepEqual(actual, expected);

        actual   = Array.fill2D(3, 3, 1);
        expected = [ [1, 1, 1], [1, 1, 1], [1, 1, 1] ];
        assert.deepEqual(actual, expected);

        actual   = Array.fill2D(3, 3, function(i, j) {
          return i * 10 + j;
        });
        expected = [ [0, 1, 2], [10, 11, 12], [20, 21, 22] ];
        assert.deepEqual(actual, expected);
      });
      it(".fillND", function() {
        actual   = Array.fillND([3, 3]);
        expected = [ [0, 0, 0], [0, 0, 0], [0, 0, 0] ];
        assert.deepEqual(actual, expected);

        actual   = Array.fillND([3, 3], 1);
        expected = [ [1, 1, 1], [1, 1, 1], [1, 1, 1] ];
        assert.deepEqual(actual, expected);

        actual   = Array.fillND([3, 3], function(i, j) {
          return i * 10 + j;
        });
        expected = [ [0, 1, 2], [10, 11, 12], [20, 21, 22] ];
        assert.deepEqual(actual, expected);
      });
      it(".fib", function() {
        actual   = Array.fib(10);
        expected = [ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 ];
        assert.deepEqual(actual, expected);
      });
      it(".rand", function() {
        var args = [];
        var h = new NumberHacker("rrand", function(b) {
          args = [ this, b ];
          return "rand";
        });
        actual   = Array.rand(5);
        expected = [ "rand", "rand", "rand", "rand", "rand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [0, 1]);

        actual   = Array.rand(5, 10, 100);
        expected = [ "rand", "rand", "rand", "rand", "rand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [10, 100]);
        h.revert();
      });
      it(".rand2", function() {
        var args = [];
        var h = new NumberHacker("rand2", function(b) {
          args = [ this ];
          return "rand2";
        });
        actual   = Array.rand2(5);
        expected = [ "rand2", "rand2", "rand2", "rand2", "rand2" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [1]);

        actual   = Array.rand2(5, 10);
        expected = [ "rand2", "rand2", "rand2", "rand2", "rand2" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [10]);
        h.revert();
      });
      it(".linrand", function() {
        var args = [];
        var h = new NumberHacker("linrand", function(b) {
          args = [ this, b ];
          return "linrand";
        });
        actual   = Array.linrand(5);
        expected = [ "linrand", "linrand", "linrand", "linrand", "linrand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [0, 1]);

        actual   = Array.linrand(5, 10, 100);
        expected = [ "linrand", "linrand", "linrand", "linrand", "linrand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [10, 100]);
        h.revert();
      });
      it(".exprand", function() {
        var args = [];
        var h = new NumberHacker("exprand", function(b) {
          args = [ this, b ];
          return "exprand";
        });
        actual   = Array.exprand(5);
        expected = [ "exprand", "exprand", "exprand", "exprand", "exprand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [0.001, 1]);

        actual   = Array.exprand(5, 10, 100);
        expected = [ "exprand", "exprand", "exprand", "exprand", "exprand" ];
        assert.deepEqual(actual, expected);
        assert.deepEqual(args, [10, 100]);
        h.revert();
      });
      it("interpolation", function() {
        actual   = Array.interpolation(1, 0, 5);
        expected = [ 0 ];
        assert.deepCloseTo(actual, expected, 1e-6);
        
        actual   = Array.interpolation(10, 0, 5);
        expected = [ 0, 0.55555555555556, 1.1111111111111, 1.6666666666667, 2.2222222222222, 2.7777777777778, 3.3333333333333, 3.8888888888889, 4.4444444444444, 5 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
    });
  });

});
