define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var utils = require("./utils");

  describe("utils.js", function() {
    it("isDict", function() {
      var __ = new (function() {})();
      assert.equal(true , utils.isDict({}));
      assert.equal(false, utils.isDict([]));
      assert.equal(false, utils.isDict(__));
      assert.equal(false, utils.isDict(null));
    });
    it("flop", function() {
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
      var actual = utils.flop(list);
      assert.deepEqual(actual, expected);
    });
    it("flatten", function() {
      var list = [ 1, [2, [3]], [4, [5, [6]]] ];
      var expected = [ 1, 2, 3, 4, 5, 6 ];
      var actual   = utils.flatten(list);
      assert.deepEqual(actual, expected);
    });
    it("clump", function() {
      var list = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
      var expected = [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8 ] ];
      var actual = utils.clump(list, 3);
      assert.deepEqual(actual, expected);
    });
  });

});
