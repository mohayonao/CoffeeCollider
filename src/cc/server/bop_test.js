define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var object = require("./object");
  var bop = require("./bop");

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
    });
    describe("__add__", function() {
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
    });
    describe("__mod__", function() {
      it("num / ary", function() {
        var actual = 1..__mod__([10, 20, 30]);
        var expected = [1%10, 1%20, 1%30];
        assert.deepEqual(actual, expected);
      });
      it("ary / ary", function() {
        var actual = [1, 2, 3].__mod__([10, 20, 30]);
        var expected = [1%10, 2%20, 3%30];
        assert.deepEqual(actual, expected);
      });
      it("ary / num", function() {
        var actual = [1, 2, 3].__mod__(10);
        var expected = [1%10, 2%10, 3%10];
        assert.deepEqual(actual, expected);
      });
    });
  });  
  
});
