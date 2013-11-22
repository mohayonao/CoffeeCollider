define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var Random = require("./random").Random;
  
  describe("lang/random.js", function() {
    var actual, expected;
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
      it("trand", function() {
        var r = new Random(1923);
        actual = [];
        for (var i = 0; i < 10; ++i) {
          actual.push(r.trand());
        }
        expected = [ 1434734233, -365758490, -1302464995, 1866865983, 1820400704,
                     2118393990, 757590367, 2051568998, 1510405633, 2022411921 ];
        assert.deepEqual(actual, expected);
      });
      it("next", function() {
        var r = new Random(1923);
        actual = [];
        for (var i = 0; i < 10; ++i) {
          actual.push(r.next());
        }
        expected = [ 0.334050094941631, 0.914840215351433, 0.696746236877516, 0.434663608437404, 0.423845067620277,
                     0.493227036204189, 0.176390252774581, 0.477668130304664, 0.351668715709820, 0.470879469299689 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
    });
  });

});
