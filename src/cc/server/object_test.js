define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var object = require("./object");

  describe("object.js", function() {
    before(function() {
      object.install();
    });
    it("__plus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2",""];
      var expected = [-1, 0, 1,1    ,0    ,NaN  ,2  ,0 ];
      actual = actual.map(function(x) {
        return x.__plus__();
      });
      assert.deepEqual(actual, expected);
    });
    it("__minus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2",""];
      var expected = [ 1,-0,-1,-1   ,-0   ,NaN  ,-2 ,-0];
      actual = actual.map(function(x) {
        return x.__minus__();
      });
      assert.deepEqual(actual, expected);
    });
  });

});
