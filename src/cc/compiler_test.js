define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Compiler = require("./compiler").Compiler;

  describe("compile", function() {
    var compiler;
    before(function() {
      compiler = new Compiler();
    });
    it("1 + 1", function() {
      var code = "1 + 1";
      var result = eval(compiler.compile(code));
      assert.equal(result, 2);
    });
  });

});
