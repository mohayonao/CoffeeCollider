define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var utils = require("./utils");
  
  describe("server/unit/utils.js", function() {
    describe("utility methods", function() {
      it("zapgremlins", function() {
        assert.equal(utils.zapgremlins(-1e-2), -1e-2);
        assert.equal(utils.zapgremlins(-1e-8), 0);
        assert.equal(utils.zapgremlins(0), 0);
        assert.equal(utils.zapgremlins(+1e-8), 0);
        assert.equal(utils.zapgremlins(+1e-2), +1e-2);
      });
      it("avoidzero", function() {
        assert.equal(utils.avoidzero(-1e-2), -1e-2);
        assert.equal(utils.avoidzero(-1e-8), -1e-6);
        assert.equal(utils.avoidzero(0), 1e-6);
        assert.equal(utils.avoidzero(+1e-8), +1e-6);
        assert.equal(utils.avoidzero(+1e-2), +1e-2);
      });
    });
  });

});
