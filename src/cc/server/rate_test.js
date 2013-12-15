define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var rate = require("./rate");
  var twopi = 2 * Math.PI;
  
  describe("server/rate.js", function() {
    it("create", function() {
      var r = cc.createRate(44100, 64);
      assert.equal(r.sampleRate, 44100  , "sampleRate");
      assert.equal(r.sampleDur , 1/44100, "sampleDur");
      assert.equal(r.radiansPerSample, twopi / 44100, "radiansPerSample");
      assert.equal(r.bufLength, 64        , "bufLength");
      assert.equal(r.bufDuration, 64/44100, "bufDuration");
      assert.equal(r.bufRate, 1/(64/44100), "bufRate");
      assert.equal(r.slopeFactor, 1/64, "slopeFactor");
      assert.equal(r.filterLoops, 21  , "filterLoops");
      assert.equal(r.filterRemain, 1  , "filterRemain");
      assert.equal(r.filterSlope, 1/21, "filterSlope");
    });
  });

});
