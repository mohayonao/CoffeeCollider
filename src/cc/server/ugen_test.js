define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var C = require("./const");
  var UGen = require("./ugen").UGen;

  describe("ugen", function() {
    it("UGen", function() {
      var ugen = UGen.multiNew(C.AUDIO, 0, 1, 2);
      assert.instanceOf(ugen, UGen);
      assert.equal(ugen.rate, C.AUDIO);
      assert.deepEqual(ugen.inputs, [0, 1, 2]);
    });
    it("[UGen]", function() {
      var list = UGen.multiNew(C.AUDIO, [0, 10, 20]);
      assert.isArray(list);
      list.forEach(function(ugen, i) {
        assert.instanceOf(ugen, UGen);
        assert.equal(ugen.rate, C.AUDIO);
        assert.deepEqual(ugen.inputs, [i * 10]);
      });
    });
  });

});
