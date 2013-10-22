define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var object = require("./object");
  var bop = require("./bop");
  var UGen = require("./ugen/ugen").UGen;
  var BinaryOpUGen = require("./ugen/basic_ops").BinaryOpUGen;

  describe("bop.js", function() {
    before(function() {
      object.install();
      bop.install();
    });
    describe("__add__", function() {
      it("num + ary", function() {
        var actual = 1..__add__([10, 20, 30]);
        var expected = [1+10, 1+20, 1+30];
        assert.deepEqual(actual, expected);
      });
      it("ary + ary", function() {
        var actual = [1, 2, 3].__add__([10, 20, 30]);
        var expected = [1+10, 2+20, 3+30];
        assert.deepEqual(actual, expected);
      });
      it("ary + num", function() {
        var actual = [1, 2, 3].__add__(10);
        var expected = [1+10, 2+10, 3+10];
        assert.deepEqual(actual, expected);
      });
      it("num + UGen", function() {
        var actual = 1..__add__(new UGen());
        assert.instanceOf(actual, UGen);
      });
      it("ary + UGen", function() {
        var actual = [1, 2, 3].__add__(new UGen());
        assert.instanceOf(actual[0], UGen);
        assert.instanceOf(actual[1], UGen);
        assert.instanceOf(actual[2], UGen);
      });
    });
    describe("__sub__", function() {
      it("num - ary", function() {
        var actual = 1..__sub__([10, 20, 30]);
        var expected = [1-10, 1-20, 1-30];
        assert.deepEqual(actual, expected);
      });
      it("ary - ary", function() {
        var actual = [1, 2, 3].__sub__([10, 20, 30]);
        var expected = [1-10, 2-20, 3-30];
        assert.deepEqual(actual, expected);
      });
      it("ary - num", function() {
        var actual = [1, 2, 3].__sub__(10);
        var expected = [1-10, 2-10, 3-10];
        assert.deepEqual(actual, expected);
      });
      it("num - UGen", function() {
        var actual = 1..__sub__(new UGen());
        assert.instanceOf(actual, UGen);
      });
      it("ary - UGen", function() {
        var actual = [1, 2, 3].__sub__(new UGen());
        assert.instanceOf(actual[0], UGen);
        assert.instanceOf(actual[1], UGen);
        assert.instanceOf(actual[2], UGen);
      });
    });
    describe("__mul__", function() {
      it("num * ary", function() {
        var actual = 1..__mul__([10, 20, 30]);
        var expected = [1*10, 1*20, 1*30];
        assert.deepEqual(actual, expected);
      });
      it("ary * ary", function() {
        var actual = [1, 2, 3].__mul__([10, 20, 30]);
        var expected = [1*10, 2*20, 3*30];
        assert.deepEqual(actual, expected);
      });
      it("ary * num", function() {
        var actual = [1, 2, 3].__mul__(10);
        var expected = [1*10, 2*10, 3*10];
        assert.deepEqual(actual, expected);
      });
      it("num * UGen", function() {
        var actual = 1..__mul__(new UGen());
        assert.instanceOf(actual, UGen);
      });
      it("ary * UGen", function() {
        var actual = [1, 2, 3].__mul__(new UGen());
        assert.instanceOf(actual[0], UGen);
        assert.instanceOf(actual[1], UGen);
        assert.instanceOf(actual[2], UGen);
      });
    });
    describe("__div__", function() {
      it("num / ary", function() {
        var actual = 1..__div__([10, 20, 30]);
        var expected = [1/10, 1/20, 1/30];
        assert.deepEqual(actual, expected);
      });
      it("ary / ary", function() {
        var actual = [1, 2, 3].__div__([10, 20, 30]);
        var expected = [1/10, 2/20, 3/30];
        assert.deepEqual(actual, expected);
      });
      it("ary / num", function() {
        var actual = [1, 2, 3].__div__(10);
        var expected = [1/10, 2/10, 3/10];
        assert.deepEqual(actual, expected);
      });
      it("num / UGen", function() {
        var actual = 1..__div__(new UGen());
        assert.instanceOf(actual, UGen);
      });
      it("ary / UGen", function() {
        var actual = [1, 2, 3].__div__(new UGen());
        assert.instanceOf(actual[0], UGen);
        assert.instanceOf(actual[1], UGen);
        assert.instanceOf(actual[2], UGen);
      });
    });
    describe("__mod__", function() {
      it("num % ary", function() {
        var actual = 1..__mod__([10, 20, 30]);
        var expected = [1%10, 1%20, 1%30];
        assert.deepEqual(actual, expected);
      });
      it("ary % ary", function() {
        var actual = [1, 2, 3].__mod__([10, 20, 30]);
        var expected = [1%10, 2%20, 3%30];
        assert.deepEqual(actual, expected);
      });
      it("ary % num", function() {
        var actual = [1, 2, 3].__mod__(10);
        var expected = [1%10, 2%10, 3%10];
        assert.deepEqual(actual, expected);
      });
      it("num % UGen", function() {
        var actual = 1..__mod__(new UGen());
        assert.instanceOf(actual, UGen);
      });
      it("ary % UGen", function() {
        var actual = [1, 2, 3].__mod__(new UGen());
        assert.instanceOf(actual[0], UGen);
        assert.instanceOf(actual[1], UGen);
        assert.instanceOf(actual[2], UGen);
      });
    });
  });  
  
});
