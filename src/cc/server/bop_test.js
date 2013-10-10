define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var bop = require("./bop");

  describe("bop:", function() {
    before(function() {
      bop.install();
    });
    describe("+", function() {
      it("(num + num)", function() {
        var actual = 1..__add__(10);
        var expected = 1 + 10;
        assert.equal(actual, expected);
      });
      it("(num + ary)", function() {
        var actual = 1..__add__([10, 20, 30]);
        var expected = [1+10, 1+20, 1+30];
        assert.deepEqual(actual, expected);
      });
      it("(ary + ary)", function() {
        var actual = [1, 2, 3].__add__([10, 20, 30]);
        var expected = [1+10, 2+20, 3+30];
        assert.deepEqual(actual, expected);
      });
      it("(ary + num)", function() {
        var actual = [1, 2, 3].__add__(10);
        var expected = [1+10, 2+10, 3+10];
        assert.deepEqual(actual, expected);
      });
      it("(str + str)", function() {
        var actual = "abc".__add__("123");
        var expected = "abc" + "123";
        assert.equal(actual, expected);
      });
    });
    describe("-", function() {
      it("(num - num)", function() {
        var actual = 1..__sub__(10);
        var expected = 1 - 10;
        assert.equal(actual, expected);
      });
      it("(ary - num)", function() {
        var actual = [1, 2, 3].__sub__(10);
        var expected = [1-10, 2-10, 3-10];
        assert.deepEqual(actual, expected);
      });
    });
    describe("*", function() {
      it("(num * num)", function() {
        var actual = 1..__mul__(10);
        var expected = 1 * 10;
        assert.equal(actual, expected);
      });
      it("(ary * num)", function() {
        var actual = [1, 2, 3].__mul__(10);
        var expected = [1*10, 2*10, 3*10];
        assert.deepEqual(actual, expected);
      });
      it("(str * num)", function() {
        var actual = "abc".__mul__(3);
        var expected = "abc" + "abc" + "abc";
        assert.equal(actual, expected);
      });
    });
    describe("/", function() {
      it("(num / num)", function() {
        var actual = 1..__div__(10);
        var expected = 1 / 10;
        assert.equal(actual, expected);
      });
      it("(ary / num)", function() {
        var actual = [1, 2, 3].__div__(10);
        var expected = [1/10, 2/10, 3/10];
        assert.deepEqual(actual, expected);
      });
    });
    describe("%", function() {
      it("(num % num)", function() {
        var actual = 1..__mod__(10);
        var expected = 1 % 10;
        assert.equal(actual, expected);
      });
      it("(ary % num)", function() {
        var actual = [1, 2, 3].__mod__(10);
        var expected = [1%10, 2%10, 3%10];
        assert.deepEqual(actual, expected);
      });
    });
  });  
  
});