define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Compiler = require("./compiler").Compiler;
  var bop = require("./bop");

  describe("compile:", function() {
    var compiler;
    before(function() {
      bop.install();
      compiler = new Compiler();
    });
    it("0 + -pi * 1", function() {
      var code = "0 + -pi * 1";
      var result = compiler.compile(code);
      assert.equal(result, "0..__add__(-Math.PI.__mul__(1));");
    });
    it("0 + 2pi * 1", function() {
      var code = "0 + 2pi * 1";
      var result = compiler.compile(code);
      assert.equal(result, "0..__add__(2..__mul__(Math.PI.__mul__(1)));");
    });
    it("10 + [1,2,3]", function() {
      var code = "10 + [1,2,3]";
      var result = compiler.compile(code);
      assert.equal(result, "10..__add__([1, 2, 3]);");
    });
    it("10 - [1,2,3]", function() {
      var code = "10 - [1,2,3]";
      var result = compiler.compile(code);
      assert.equal(result, "10..__sub__([1, 2, 3]);");
    });
    it("10 * [1,2,3]", function() {
      var code = "10 * [1,2,3]";
      var result = compiler.compile(code);
      assert.equal(result, "10..__mul__([1, 2, 3]);");
    });
    it("10 / [1,2,3]", function() {
      var code = "10 / [1,2,3]";
      var result = compiler.compile(code);
      assert.equal(result, "10..__div__([1, 2, 3]);");
    });
    it("10 % [1,2,3]", function() {
      var code = "10 % [1,2,3]";
      var result = compiler.compile(code);
      assert.equal(result, "10..__mod__([1, 2, 3]);");
    });

    it("[1,2,3] + 10", function() {
      var code = "[1,2,3] + 10";
      var result = compiler.compile(code);
      assert.equal(result, "[1, 2, 3].__add__(10);");
    });
    it("[1,2,3] - 10", function() {
      var code = "[1,2,3] - 10";
      var result = compiler.compile(code);
      assert.equal(result, "[1, 2, 3].__sub__(10);");
    });
    it("[1,2,3] * 10", function() {
      var code = "[1,2,3] * 10";
      var result = compiler.compile(code);
      assert.equal(result, "[1, 2, 3].__mul__(10);");
    });
    it("[1,2,3] / 10", function() {
      var code = "[1,2,3] / 10";
      var result = compiler.compile(code);
      assert.equal(result, "[1, 2, 3].__div__(10);");
    });
    it("[1,2,3] % 10", function() {
      var code = "[1,2,3] % 10";
      var result = compiler.compile(code);
      assert.equal(result, "[1, 2, 3].__mod__(10);");
    });
  });

});
