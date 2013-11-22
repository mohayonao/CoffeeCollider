define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var Random = require("./random").Random;
  
  describe("lang/random.js", function() {
    describe("Random", function() {
      it("create", function() {
        var r = new Random();
        assert.instanceOf(r, Random);
      });
      it("next", function() {
        var r = new Random(1243598712);
        var r1 = r.next();
        var r2 = r.next();
        assert.isNumber(r1);
        assert.isNumber(r2);
        assert.notEqual(r1, r2);
      });
      it("seed", function() {
        var r1 = new Random(3093459420);
        var r2 = new Random(3093459420);
        assert.equal(r1.next(), r2.next());
        assert.equal(r1.next(), r2.next());
      });
      it("seed", function() {
        var r1 = new Random(1821928731);
        var r2 = new Random(1821928721);
        assert.notEqual(r1.next(), r2.next());
        assert.notEqual(r1.next(), r2.next());
      });
    });
  });

});
