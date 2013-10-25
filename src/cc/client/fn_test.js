define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var fn = require("./fn");

  describe("fn.js", function() {
    describe("Fn", function() {
      it("defaults", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").build();
        assert.equal(madd(10)          , 10);
        assert.equal(madd(10, 2)       , 20);
        assert.equal(madd(10, {add:20}), 30);
      });
      it("multiCall", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).multiCall().build();
        assert.deepEqual(madd(10, [1, 2], 0), [10, 20]);
      });
      it("defaults * multiCall", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").multiCall().build();
        assert.deepEqual(madd(10, [1, 2]), [10, 20]);
      });
    });
  });
  
});
