define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  
  describe("array.js", function() {
    before(function() {
      require("./number");
      require("./array");
    });
    describe("uop", function() {
      it("uop", function() {
        var actual   = [ -2, -1, +0, +1, +2 ].neg();
        var expected = [ +2, +1, -0, -1, -2 ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("bop", function() {
      before(function() {
        cc.instanceOfUGen = function() {
          return false;
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
      });
      it("array:fold b", function() {
        var actual   = [ -2, -1, +0, +1, +2 ].max([0, 2, 1], C.FOLD);
        var expected = [  0,  2,  1,  2,  2 ];
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
