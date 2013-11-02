define(function(require, exports, module) {

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  require("./ugen/ugen");
  require("./object");
  require("./number");

  var pattern = require("./pattern");
  
  describe("pattern.js", function() {
    var emitted;
    beforeEach(function() {
      pattern.use();
      emitted = false;
    });
    describe("PSequence", function() {
      it("without offset", function() {
        var pseq = cc.createPSequence([1, 2, 3], 3, 0).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(11);
        var expected = [ 1, 2, 3, 1, 2, 3, 1, 2, 3, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
      it("with offset", function() {
        var pseq = cc.createPSequence([1, 2, 3], 3, 1).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(11);
        var expected = [ 2, 3, 1, 2, 3, 1, 2, 3, 1, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
      it("nesting", function() {
        var pseq1 = cc.createPSequence([1, 2, 3], 3, 0);
        var pseq2 = cc.createPSequence([pseq1, 4], 2, 0).on("end", function() {
          emitted = true;
        });
        var actual   = pseq2.nextN(22);
        var expected = [ 1, 2, 3, 1, 2, 3, 1, 2, 3, 4,
                         1, 2, 3, 1, 2, 3, 1, 2, 3, 4, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
    });
    describe("PShuffle", function() {
      it("shuffle", function() {
        var pshuf = cc.createPShuffle([1, 2, 3], 3).on("end", function() {
          emitted = true;
        });
        var actual   = pshuf.nextN(11).sort(); // umm..
        var expected = [ 1, 1, 1, 2, 2, 2, 3, 3, 3, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
    });
    describe("PUnaryOperator", function() {
      it("midicps", function() {
        var pmidicps = cc.createPSequence([60, 62, 64], 3, 0).on("end", function() {
          emitted = true;
        }).midicps();
        var actual   = pmidicps.nextN(11);
        var expected = [ 261.6255653006, 293.66476791741, 329.62755691287,
                         261.6255653006, 293.66476791741, 329.62755691287,
                         261.6255653006, 293.66476791741, 329.62755691287, null, null ];
        assert.deepCloseTo(actual, expected, 1e-6);
        assert.isTrue(emitted);
      });
    });
    describe("PBinaryOp", function() {
      it("max", function() {
        assert.throw(function() {
          cc.createPSequence([60, 62, 64], 3, 0).on("end", function() {
          emitted = true;
          }).max(61);
        });
      });
    });
  });

});
