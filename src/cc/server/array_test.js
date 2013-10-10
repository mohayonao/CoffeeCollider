define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var array = require("./array");

  describe("array", function() {
    it("zip", function() {
      var list = [
        [ "moe", "larry", "curly" ],
        [    30,      40,      50 ],
           true,
      ];
      var expected = [
        [ "moe"  , 30, true ],
        [ "larry", 40, true ],
        [ "curly", 50, true ],
      ];
      var actual = array.zip.apply(null, list);
      assert.deepEqual(actual, expected);
    });
    it("flatten", function() {
      var list = [1, [2], [3, [[4]]]];
      var expected = [ 1, 2, 3, 4 ];
      var actual = array.flatten(list);
      assert.deepEqual(actual, expected);
    });
    it("flatten with level", function() {
      var list = [1, [2], [3, [[4]]]];
      var expected = [ 1, 2, 3, [4] ];
      var actual = array.flatten(list, 2);
      assert.deepEqual(actual, expected);
    });
    it("clump", function() {
      var list = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
      var expected = [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8 ] ];
      var actual = array.clump(list, 3);
      assert.deepEqual(actual, expected);
    });
  });
  
});
