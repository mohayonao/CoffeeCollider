define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Compiler = require("../client/compiler").Compiler;
  var uop = require("../server/uop");
  var bop = require("../server/bop");

  describe("arithmetic", function() {
    var calc;
    var cc = {};
    before(function() {
      var compiler = new Compiler();
      uop.install(cc);
      bop.install(cc);
      calc = function(expr) {
        return eval.call(null, compiler.compile(expr));
      };
    });
    it("1 + 2 * 3", function() {
      var expr = "1 + 2 * 3";
      var expected = 1 + 2 * 3;
      var actual = calc(expr);
      assert.equal(actual, expected);
    });
    it("(1 + 2) * 3", function() {
      var expr = "(1 + 2) * 3";
      var expected = (1 + 2) * 3;
      var actual = calc(expr);
      assert.equal(actual, expected);
    });
    it("1 + 2 / 10pi", function() {
      var expr = "1 + 2 / 10pi";
      var expected = 1 + 2 / (10 * Math.PI);
      var actual = calc(expr);
      assert.equal(actual, expected);
    });
    it("~-1 * 10", function() {
      var expr = "~-1 * 10";
      var expected = ~-1 * 10;
      var actual = calc(expr);
      assert.equal(actual, expected);
    });
    it("1000 + [1, 2, 3]", function() {
      var expr = "1000 + [1, 2, 3]";
      var expected = [ 1001, 1002, 1003 ];
      var actual = calc(expr);
      assert.deepEqual(actual, expected);
    });
    it("1 + +!![0..5]", function() {
      var expr = "1 + +!![0..5]";
      var expected = [ 1, 2, 2, 2, 2, 2 ];
      var actual = calc(expr);
      assert.deepEqual(actual, expected);
    });
  });
  
});
