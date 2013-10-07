define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Compiler = require("./compiler").Compiler;

  describe("compile", function() {
    var compiler;
    before(function() {
      compiler = new Compiler();
    });
    it("0 + -pi * 1", function() {
      var code = "0 + -pi * 1";
      var result = eval(compiler.compile(code));
      assert.equal(result, 0 + -Math.PI * 1);
    });
    it("0 + 2pi * 1", function() {
      var code = "0 + 2pi * 1";
      var result = eval(compiler.compile(code));
      assert.equal(result, 0 + 2 * Math.PI * 1);
    });
  });

});
