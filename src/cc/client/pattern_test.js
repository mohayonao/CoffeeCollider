define(function(require, exports, module) {

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var pattern = require("./pattern");
  
  describe.only("pattern.js", function() {
    var emitted;
    beforeEach(function() {
      pattern.use();
      emitted = false;
    });
    describe("PSequence", function() {
      it("without offset", function() {
        var pseq = cc.createPSequence([1, 2], 5, 0).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(10);
        var expected = [ 1, 2, 1, 2, 1, null, null, null, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
      it("with offset", function() {
        var pseq = cc.createPSequence([1, 2], 5, 1).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(10);
        var expected = [ 2, 1, 2, 1, 2, null, null, null, null, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
    });
    describe("PList", function() {
      it("without offset", function() {
        var pseq = cc.createPList([1, 2], 3, 0).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(7);
        var expected = [ 1, 2, 1, 2, 1, 2, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
      it("with offset", function() {
        var pseq = cc.createPList([1, 2], 3, 1).on("end", function() {
          emitted = true;
        });
        var actual   = pseq.nextN(7);
        var expected = [ 2, 1, 2, 1, 2, 1, null ];
        assert.deepEqual(actual, expected);
        assert.isTrue(emitted);
      });
    });
  });

});
