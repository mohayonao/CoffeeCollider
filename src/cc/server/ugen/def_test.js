define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var def = require("./def");

  describe("def", function() {
    describe("splitArguments", function() {
      it("none", function() {
        var args = "";
        var expected = [];
        var actual = def.splitArguments(args);
        assert.deepEqual(actual, expected);
      });
      it("a", function() {
        var args = "a";
        var expected = ["a"];
        var actual = def.splitArguments(args);
        assert.deepEqual(actual, expected);
      });
      it('a, b=100, c=[100, 200], d="\\"300,\'400\'\\\\"', function() {
        var args = 'a, b=100, c=[100, 200], d="\\"300,\'400\'\\\\"';
        var expected = ["a", "b=100", "c=[100, 200]", 'd="\\"300,\'400\'\\\\"'];
        var actual = def.splitArguments(args);
        assert.deepEqual(actual, expected);
      });
    });
    describe("unpackArguments", function() {
      it("none", function() {
        var args = "";
        var expected = { keys: [], vals: [] };
        var actual = def.unpackArguments(args);
        assert.deepEqual(actual, expected);
      });
      it("x,y=10", function() {
        var args = "x,y=10";
        var expected = { keys: [ "x", "y" ], vals: [ undefined, 10 ] };
        var actual = def.unpackArguments(args);
        assert.deepEqual(actual, expected);
      });
      it("x,y=[10,20]", function() {
        var args = "x,y=[10,20]";
        var expected = { keys: [ "x", "y" ], vals: [ undefined, [10,20] ] };
        var actual = def.unpackArguments(args);
        assert.deepEqual(actual, expected);
      });
    });
  });

});
