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
        var a = 1..__add__(10);
        var b = 1 + 10;
        assert.equal(a, b);
      });
      it("(num + ary)", function() {
        var a = 1..__add__([10, 20, 30]);
        var b = [1+10, 1+20, 1+30];
        assert.deepEqual(a, b);
      });
      it("(ary + ary)", function() {
        var a = [1, 2, 3].__add__([10, 20, 30]);
        var b = [1+10, 2+20, 3+30];
        assert.deepEqual(a, b);
      });
      it("(ary + num)", function() {
        var a = [1, 2, 3].__add__(10);
        var b = [1+10, 2+10, 3+10];
        assert.deepEqual(a, b);
      });
      it("(str + str)", function() {
        var a = "abc".__add__("123");
        var b = "abc" + "123";
        assert.equal(a, b);
      });
    });
    describe("-", function() {
      it("(num - num)", function() {
        var a = 1..__sub__(10);
        var b = 1 - 10;
        assert.equal(a, b);
      });
      it("(ary - num)", function() {
        var a = [1, 2, 3].__sub__(10);
        var b = [1-10, 2-10, 3-10];
        assert.deepEqual(a, b);
      });
    });
    describe("*", function() {
      it("(num * num)", function() {
        var a = 1..__mul__(10);
        var b = 1 * 10;
        assert.equal(a, b);
      });
      it("(ary * num)", function() {
        var a = [1, 2, 3].__mul__(10);
        var b = [1*10, 2*10, 3*10];
        assert.deepEqual(a, b);
      });
      it("(str * num)", function() {
        var a = "abc".__mul__(3);
        var b = "abc" + "abc" + "abc";
        assert.equal(a, b);
      });
    });
    describe("/", function() {
      it("(num / num)", function() {
        var a = 1..__div__(10);
        var b = 1 / 10;
        assert.equal(a, b);
      });
      it("(ary / num)", function() {
        var a = [1, 2, 3].__div__(10);
        var b = [1/10, 2/10, 3/10];
        assert.deepEqual(a, b);
      });
    });
    describe("%", function() {
      it("(num % num)", function() {
        var a = 1..__mod__(10);
        var b = 1 % 10;
        assert.equal(a, b);
      });
      it("(ary % num)", function() {
        var a = [1, 2, 3].__mod__(10);
        var b = [1%10, 2%10, 3%10];
        assert.deepEqual(a, b);
      });
    });
  });  
  
});
