define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var register = require("./installer").register;
  var object = require("./object");
  var uop = require("./uop");

  describe("uop.js", function() {
    before(function() {
      object.install();
      uop.install();
    });
    it("__plus__", function() {
      var tokens = [-1, 0, 1, [-1, -0, 1], "10"];
      var expected = [-1, 0, 1, [-1, -0, 1], 10];
      var actual = tokens.__plus__();
      assert.deepEqual(actual, expected);
    });
    it("__minus__", function() {
      var tokens = [-1, 0, 1, [-1, -0, 1], "10"];
      var expected = [+1, -0, -1, [+1, 0, -1], -10];
      var actual = tokens.__minus__();
      assert.deepEqual(actual, expected);
    });
  });  

});
