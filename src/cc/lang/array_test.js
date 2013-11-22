define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc  = require("./cc");
  var ops = require("../common/ops");
  var random = require("../common/random");
  var array  = require("./array");
  
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
      cc.lang = {};
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
        var list;
        beforeEach(function() {
          list  = [ 1, -2, 3, -5, 8, -13 ];
          cc.lang.random = new random.Random(1923);
        });
        it("size", function() {
          assert.equal(list.size(), list.length);
        });
        it("minItem", function() {
          assert.equal(list.minItem(), -13);
          assert.equal(list.minItem(function(x) {
            return Math.abs(x) % 3;
          }), 3);
        });
        it("minValue", function() {
          assert.equal(list.minValue(), -13);
        });
        it("maxItem", function() {
          assert.equal(list.maxItem(), 8);
          assert.equal(list.maxItem(function(x) {
            return Math.abs(x) % 3;
          }), -2);
        });
        it("maxValue", function() {
          assert.equal(list.maxValue(), 8);
        });
        it("at", function() {
          actual   = list.at([-9, -2, 3, 7, 12]);
          expected = [ undefined, undefined, -5, undefined, undefined ];
          assert.deepEqual(actual, expected);
        });
        it("clipAt", function() {
          actual   = list.clipAt([-9, -2, 3, 7, 12]);
          expected = [ 1, 1, -5, -13, -13 ];
          assert.deepEqual(actual, expected);
        });
        it("wrapAt", function() {
          actual   = list.wrapAt([-9, -2, 3, 7, 12]);
          expected = [ -5, 8, -5, -2, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("foldAt", function() {
          actual   = list.foldAt([-9, -2, 3, 7, 12]);
          expected = [ -2, 3, -5, -5, 3 ];
          assert.deepEqual(actual, expected);
        });
        it("blendAt", function() {
          actual   = list.blendAt([1.1, 2.2, 3.3, 4.4, 5.5]);
          expected = [ -1.5, 1.4, -1.1, -0.40000000000001, -13 ];
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("put", function() {
          actual   = list.put([-9, -2, 3, 7, 12], [0]);
          expected = [ 1, -2, 3, [0], 8, -13 ];
          assert.deepEqual(actual, expected);
        });
        it("clipPut", function() {
          actual   = list.clipPut([-9, -2, 3, 7, 12], [0]);
          expected = [ [0], -2, 3, [0], 8, [0] ];
          assert.deepEqual(actual, expected);
        });
        it("wrapPut", function() {
          actual   = list.wrapPut([-9, -2, 3, 7, 12], [0]);
          expected = [ [0], [0], 3, [0], [0], -13 ];
          assert.deepEqual(actual, expected);
        });
        it("foldPut", function() {
          actual   = list.foldPut([-9, -2, 3, 7, 12], [0]);
          expected = [ 1, [0], [0], [0], 8, -13 ];
          assert.deepEqual(actual, expected);
        });
        it("insert", function() {
          actual   = list.insert(-1, [0]);
          expected = [ [0], 1, -2, 3, -5, 8, -13 ];
          assert.deepEqual(actual, expected);

          actual   = list.insert(2, [0]);
          expected = [ [0], 1, [0], -2, 3, -5, 8, -13 ];
          assert.deepEqual(actual, expected);

          actual   = list.insert(100, [0]);
          expected = [ [0], 1, [0], -2, 3, -5, 8, -13, [0] ];
          assert.deepEqual(actual, expected);
        });
        it("swap", function() {
          actual   = list.swap(2, 5);
          expected = [ 1, -2, -13, -5, 8, 3 ];
          assert.deepEqual(actual, expected);

          actual   = list.swap(-9, 12);
          expected = [ 1, -2, -13, -5, 8, 3 ];
          assert.deepEqual(actual, expected);
        });
        it("clipSwap", function() {
          actual   = list.clipSwap(2, 5);
          expected = [ 1, -2, -13, -5, 8, 3 ];
          assert.deepEqual(actual, expected);

          actual   = list.clipSwap(-9, 12);
          expected = [ 3, -2, -13, -5, 8, 1 ];
          assert.deepEqual(actual, expected);
        });
        it("wrapSwap", function() {
          actual   = list.wrapSwap(2, 5);
          expected = [ 1, -2, -13, -5, 8, 3 ];
          assert.deepEqual(actual, expected);

          actual   = list.wrapSwap(-9, 12);
          expected = [ -5, -2, -13, 1, 8, 3 ];
          assert.deepEqual(actual, expected);
        });
        it("foldSwap", function() {
          actual   = list.foldSwap(2, 5);
          expected = [ 1, -2, -13, -5, 8, 3 ];
          assert.deepEqual(actual, expected);

          actual   = list.foldSwap(-9, 12);
          expected = [ 1, -13, -2, -5, 8, 3 ];
          assert.deepEqual(actual, expected);
        });
        it("sum", function() {
          actual   = list.sum();
          expected = list.reduce(function(a, b) {
            return a + b;
          }, 0);
          assert.equal(actual, expected);
        });
        it("normalize", function() {
          var h = new NumberHacker("linlin", function(inMin, inMax, outMin, outMax) {
            return (this-inMin)/(inMax-inMin) * (outMax-outMin) + outMin;
          });
          actual   = list.normalize();
          expected = [ 0.66666666666667, 0.52380952380952, 0.76190476190476, 0.38095238095238, 1, 0 ];
          assert.deepCloseTo(actual, expected, 1e-6);
          h.revert();
        });
        it("normalizeSum", function() {
          actual   = list.normalizeSum();
          expected = [ -0.125, 0.25, -0.375, 0.625, -1, 1.625 ];
          assert.deepEqual(actual, expected);
        });
        it("mirror", function() {
          actual   = list.mirror();
          expected = [ 1, -2, 3, -5, 8, -13, 8, -5, 3, -2, 1 ];
          assert.deepEqual(actual, expected);

          actual   = [ 1 ].mirror();
          expected = [ 1 ];
          assert.deepEqual(actual, expected);
          
          actual   = [].mirror();
          expected = [];
          assert.deepEqual(actual, expected);
        });
        it("mirror1", function() {
          actual   = list.mirror1();
          expected = [ 1, -2, 3, -5, 8, -13, 8, -5, 3, -2 ];
          assert.deepEqual(actual, expected);
          
          actual   = [ 1 ].mirror1();
          expected = [ 1 ];
          assert.deepEqual(actual, expected);
          
          actual   = [].mirror1();
          expected = [];
          assert.deepEqual(actual, expected);
        });
        it("mirror2", function() {
          actual   = list.mirror2();
          expected = [ 1, -2, 3, -5, 8, -13, -13, 8, -5, 3, -2, 1 ];
          assert.deepEqual(actual, expected);

          actual   = [ 1 ].mirror2();
          expected = [ 1, 1 ];
          assert.deepEqual(actual, expected);
          
          actual   = [].mirror2();
          expected = [];
          assert.deepEqual(actual, expected);
        });
        it("stutter", function() {
          actual   = list.stutter(3);
          expected = [ 1,1,1, -2,-2,-2, 3,3,3, -5,-5,-5, 8,8,8, -13,-13,-13 ];
          assert.deepEqual(actual, expected);

          actual   = list.stutter(-1);
          expected = [ ];
          assert.deepEqual(actual, expected);
        });
        it("rotate", function() {
          actual   = list.rotate(10);
          expected = [ 3, -5, 8, -13, 1, -2 ];
          assert.deepEqual(actual, expected);

          actual   = list.rotate(-10);
          expected = [ 8, -13, 1, -2, 3, -5 ];
          assert.deepEqual(actual, expected);
        });
        it("sputter", function() {
          actual   = list.sputter(0.5, 10);
          expected = [ 1, -2, -2, -2, 3, -5, 8, -13 ];
          assert.deepEqual(actual, expected);
        });
        it("clipExtend", function() {
          actual   = list.clipExtend(10);
          expected = [ 1, -2, 3, -5, 8, -13, -13, -13, -13, -13 ];
          assert.deepEqual(actual, expected);
          
          actual   = list.clipExtend(list.length);
          expected = list;
          assert.notEqual(actual, expected);
          assert.deepEqual(actual, expected);
        });
        it("wrapExtend", function() {
          actual   = list.wrapExtend(10);
          expected = [ 1, -2, 3, -5, 8, -13, 1, -2, 3, -5 ];
          assert.deepEqual(actual, expected);
          
          actual   = list.wrapExtend(list.length);
          expected = list;
          assert.notEqual(actual, expected);
          assert.deepEqual(actual, expected);
        });
        it("foldExtend", function() {
          actual   = list.foldExtend(10);
          expected = [ 1, -2, 3, -5, 8, -13, 8, -5, 3, -2 ];
          assert.deepEqual(actual, expected);
          
          actual   = list.foldExtend(list.length);
          expected = list;
          assert.notEqual(actual, expected);
          assert.deepEqual(actual, expected);
        });
        it("resamp0", function() {
          actual   = list.resamp0(10);
          expected = [ 1, -2, -2, 3, 3, -5, -5, 8, 8, -13 ];
          assert.deepEqual(actual, expected);
        });
        it("resamp1", function() {
          actual   = list.resamp1(10);
          expected = [ 1, -0.66666666666667, -1.4444444444444, 1.3333333333333, 1.2222222222222, -3.2222222222222, -0.66666666666666, 6.5555555555556, -1.3333333333333, -13 ];
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("scramble", function() {
          actual   = [ 1, -2, 3, -5, 8, -13 ].scramble();
          expected = [ 3, -13, 8, 1, -5, -2 ];
          assert.deepEqual(actual, expected);
        });
        it("choose", function() {
          assert.equal(list.choose(),   3);
          assert.equal(list.choose(), -13);
          assert.equal(list.choose(),   8);
          assert.equal(list.choose(),   3);
          assert.equal(list.choose(),   3);
          assert.equal(list.choose(),   3);
        });
        it("dup", function() {
          actual   = list.dup();
          expected = [ [ 1, -2, 3, -5, 8, -13 ], [ 1, -2, 3, -5, 8, -13 ] ];
          assert.deepEqual(actual, expected);
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
