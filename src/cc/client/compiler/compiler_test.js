define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("../../cc");

  describe("client/compiler/compiler.js", function() {
    before(function() {
      require("./compiler").use();
    });
    it("create", function() {
      var actual;
      cc.createCoffeeCompiler = function() {
        actual = "coffee";
      };
      cc.createCompiler("coffee");
      assert.equal(actual, "coffee");

      assert.throw(function() {
        cc.createCompiler("not implements");
      }, TypeError);
    });
  });

});
