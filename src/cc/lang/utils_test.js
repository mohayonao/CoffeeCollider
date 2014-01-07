define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var utils = require("./utils");

  describe("lang/utils.js", function() {
    var list, actual, expected;
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
      
      assert.deepEqual(utils.flop([]), []);
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
      assert.deepEqual(utils.clump([], 2), []);
    });
    describe("maxSizeAtDepth", function() {
      it("empty list", function() {
        list = [];
        actual   = utils.maxSizeAtDepth(list, 0);
        expected = 0;
        assert.equal(actual, expected, "rank(0)");
        
        actual   = utils.maxSizeAtDepth(list, 1);
        expected = 0;
        assert.equal(actual, expected, "rank(1)");
      });
      it("", function() {
        list = [ [1, 2], [3, 4, [ 5, 6, 7, 8 ] ] ];
        actual   = utils.maxSizeAtDepth(list, 0);
        expected = 2;
        assert.equal(actual, expected, "rank(0)");
        
        actual   = utils.maxSizeAtDepth(list, 1);
        expected = 3;
        assert.equal(actual, expected, "rank(1)");

        actual   = utils.maxSizeAtDepth(list, 2);
        expected = 4;
        assert.equal(actual, expected, "rank(2)");

        actual   = utils.maxSizeAtDepth(list, 3);
        expected = 1;
        assert.equal(actual, expected, "rank(3)");

        actual   = utils.maxSizeAtDepth(list, 4);
        expected = 1;
        assert.equal(actual, expected, "rank(4)");
      });
    });
  });

});
