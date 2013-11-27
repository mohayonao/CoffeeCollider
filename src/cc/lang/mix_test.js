define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc  = require("./cc");
  var fn  = require("./fn");
  var mix = require("./mix");

  var parse = function(a) {
    if (typeof a === "string") {
      return JSON.parse(a);
    }
    return a.map(parse);
  };

  describe("mix.js", function() {
    before(function() {
      cc.createSum4 = fn(function(a, b, c, d) {
        return "[" + [a, b, c, d].join(",") +"]";
      }).multiCall().build();
      cc.createSum3 = fn(function(a, b, c) {
        return "[" + [a, b, c].join(",") + "]";
      }).multiCall().build();
      cc.createBinaryOpUGen = fn(function(selector, a, b) {
        return "[" + [a, b].join(",") + "]";
      }).multiCall().build();
    });
    it("mix 1", function() {
      var a = cc.global.Mix(1);
      assert.equal(a, 1);
    });
    it("mix [1]", function() {
      var a = cc.global.Mix([1]);
      assert.equal(a, 1);
    });
    it("mix [1..2]", function() {
      var a = cc.global.Mix([1, 2]);
      assert.deepEqual(parse(a), [1, 2]);
    });
    it("mix [1..3]", function() {
      var a = cc.global.Mix([1, 2, 3]);
      assert.deepEqual(parse(a), [1, 2, 3]);
    });
    it("mix [1..4]", function() {
      var a = cc.global.Mix([1, 2, 3, 4]);
      assert.deepEqual(parse(a), [1, 2, 3, 4]);
    });
    it("mix [1..5]", function() {
      var a = cc.global.Mix([1, 2, 3, 4, 5]);
      assert.deepEqual(parse(a), [[1,2,3,4], 5]);
    });
    it("mix [1..6]", function() {
      var a = cc.global.Mix([1, 2, 3, 4, 5, 6]);
      // TODO: fix ti
      // assert.deepEqual(a, {l:["sum3", {l:["Sum4",1,2,3,4]}, 5 ,6]});
      assert.deepEqual(parse(a), [[1,2,3,4], [5,6]]);
    });
    it("mix [[1,2], [10,20]]", function() {
      var a = cc.global.Mix([[1,2], [10,20]]);
      assert.deepEqual(parse(a), [[1,10], [2,20]]);
    });
    it("mix [[1,2,3], [10,20,30]]", function() {
      var a = cc.global.Mix([[1,2], [10,20], [100,200]]);
      assert.deepEqual(parse(a), [[1,10,100], [2,20,200]]);
    });
    it("mix [[[1,2], [10,20]], [100,200]]", function() {
      var a = cc.global.Mix([[[1,2], [10,20]], [100,200]]);
      assert.deepEqual(parse(a), [[[1,100],[2,100]], [[10,200],[20,200]]]);
    });
  });

});
