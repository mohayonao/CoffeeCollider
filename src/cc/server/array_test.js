define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var array = require("./array");

  describe("array", function() {
    it("zip", function() {
      var x = [
        [ "moe", "larry", "curly" ],
        [    30,      40,      50 ],
           true,
      ];
      var expected = [
        [ "moe"  , 30, true ],
        [ "larry", 40, true ],
        [ "curly", 50, true ],
      ];
      var actual = array.zip.apply(null, x);
      assert.deepEqual(actual, expected);
    });
  });  
  
});
