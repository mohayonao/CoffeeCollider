define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc  = require("./cc");
  var ops = require("../common/ops");
  
  describe("lang/array.js", function() {
    before(function() {
      ops.UNARY_OP_UGEN_MAP.push("??array_test??");
      require("./number");
      require("./array");
    });
    describe("uop", function() {
      it("uop", function() {
        var list = [ -2, -1, +0, +1, +2 ];
        var actual   = list.__plus__();
        var expected = list.map(function(a) {
          return a.__plus__();
        });
        assert.deepEqual(actual, expected);
      });
      it("undefined", function() {
        var actual = []["??array_test??"];
        assert.isUndefined(actual);
      });
    });
    describe("bop", function() {
      before(function() {
        cc.instanceOfUGen = function() {
          return false;
        };
        cc.createTaskWaitLogic = function(logic, list) {
          return [logic].concat(list);
        };
      });
      it("scalar", function() {
        var actual   = [ -2, -1,  0, +1, +2 ].max(0);
        var expected = [  0,  0,  0,  1,  2 ];
        assert.deepEqual(actual, expected);
      });
      it("array:wrap", function() {
        var actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0, -1, -2]);
        var expected = [  2,  1,  0,  1,  2 ];
        assert.deepEqual(actual, expected);
      });
      it("array:wrap a", function() {
        var actual   = [ -2, -1,  0 ].max([2, 1, 0, -1, -2]);
        var expected = [  2,  1,  0,  -1,  -1 ];
        assert.deepEqual(actual, expected);
      });
      it("array:wrap b", function() {
        var actual   = [ -2, -1,  0, +1, +2 ].max([2, 1, 0]);
        var expected = [  2,  1,  0,  2,  2 ];
        assert.deepEqual(actual, expected);
      });
      it("array:short a", function() {
        var actual   = [ 1, 2 ].max([ 0, 3, 6 ], C.SHORT);
        var expected = [ 1, 3 ];
        assert.deepEqual(actual, expected);
        
        actual   = [ 1, 2 ].max([ 0, 3 ], C.SHORT);
        expected = [ 1, 3 ];
        assert.deepEqual(actual, expected);
      });
      it("array:short b", function() {
        var actual   = [ -2, -1, +0, +1, +2 ].max([0, 0, 1], C.SHORT);
        var expected = [  0,  0,  1];
        assert.deepEqual(actual, expected);
      });
      it("array:fold a", function() {
        var actual   = [ 1, 2 ].max([ 0, 3, 6 ], C.FOLD);
        var expected = [ 1, 3, 6 ];
        assert.deepEqual(actual, expected);
        
        actual   = [ -2, -1, +0, +1, +2 ].max([0, 2, 1], C.FOLD);
        expected = [  0,  2,  1,  2,  2 ];
        assert.deepEqual(actual, expected);
        
        actual   = [ -2, -1, +0 ].max([0, 2, 1], C.FOLD);
        expected = [  0,  2,  1 ];
        assert.deepEqual(actual, expected);
      });
      it("array:table", function() {
        var actual   = [ -2, -1, +0, +1, +2 ].max([0, 1], C.TABLE);
        var expected = [ [ 0, 1 ], [ 0, 1 ], [ 0, 1 ], [ 1, 1 ], [ 2, 2 ] ];
        assert.deepEqual(actual, expected);
      });
      it("array:flat", function() {
        var actual   = [ -2, -1, +0, +1, +2 ].max([0, 1], C.FLAT);
        var expected = [ 0, 1, 0, 1, 0, 1, 1, 1, 2, 2 ];
        assert.deepEqual(actual, expected);
      });
      it("__and__", function() {
        assert.deepEqual([1,2].__and__(3), ["and", 1, 2, 3]);
      });
      it("__or__", function() {
        assert.deepEqual([1,2].__or__(3), ["or", 1, 2, 3]);
      });
      it("ugen", function() {
        var actual = [];
        cc.instanceOfUGen = function() {
          return true;
        };
        cc.createBinaryOpUGen = function(selector, a, b) {
          actual.push(selector);
        };
        [ 1, 2 ].max(0);
        var expected = [ "max", "max" ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("others", function() {
      before(function() {
        cc.createMulAdd = function(a, mul, add) {
          return a * mul + add;
        }
      });
      it("madd", function() {
        var actual   = [5, 4].madd(2, 3);
        var expected = [ 5*2+3, 4*2+3 ];
        assert.deepEqual(actual, expected);
      });
    });
  });

});
