define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc     = require("./cc");
  var random = require("./random");

  describe("random.js", function() {
    before(function() {
      random.use();
      random.exports();
    });
    describe("Random", function() {
      it("create", function() {
        var r = cc.global.Random();
        assert.isTrue(cc.instanceOfRandom(r));
      });
      it("next", function() {
        var r = cc.createRandom(1243598712);
        var r1 = r.next();
        var r2 = r.next();
        assert.isNumber(r1);
        assert.isNumber(r2);
        assert.notEqual(r1, r2);
      });
      it("seed", function() {
        var r1 = cc.createRandom(3093459400);
        var r2 = cc.createRandom(3093459400);
        assert.equal(r1.next(), r2.next());
        assert.equal(r1.next(), r2.next());
      });
      it("seed", function() {
        var r1 = cc.createRandom(1821928731);
        var r2 = cc.createRandom(1821928721);
        assert.notEqual(r1.next(), r2.next());
        assert.notEqual(r1.next(), r2.next());
      });
    });
  });

});
