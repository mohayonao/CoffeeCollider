define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc  = require("./cc");
  var env = require("./env");
  
  describe("lang/env", function() {
    var env, actual, expected;
    describe("class method", function() {
      before(function() {
        testTools.useFourArithmeticOperations();
      });
      after(function() {
        testTools.unuseFourArithmeticOperations();
      });
      it("triangle", function() {
        env = cc.global.Env.triangle();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 1, 0.5, 1, 0, 0, 0.5, 1, 0 ] ];
        assert.deepEqual(actual, expected);

        env = cc.global.Env.triangle(2, 3);
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 3, 1, 1, 0, 0, 1, 1, 0 ] ];
        assert.deepEqual(actual, expected);
      });
      it("sine", function() {
        env = cc.global.Env.sine();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 1, 0.5, 3, 0, 0, 0.5, 3, 0 ] ];
        assert.deepEqual(actual, expected);

        env = cc.global.Env.sine(2, 3);
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 3, 1, 3, 0, 0, 1, 3, 0 ] ];
        assert.deepEqual(actual, expected);
      });
      it("perc", function() {
        env = cc.global.Env.perc();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 1, 0.01, 5, -4, 0, 1, 5, -4 ] ];
        assert.deepEqual(actual, expected);
        
        env = cc.global.Env.perc(1, 2, 3, "cub");
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, -99, -99, 3, 1, 7, 0, 0, 2, 7, 0 ] ];
        assert.deepEqual(actual, expected);
      });
      it("linen", function() {
        env = cc.global.Env.linen();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 3, -99, -99, 1, 0.01, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0 ] ];
        assert.deepEqual(actual, expected);
        
        env = cc.global.Env.linen(1, 2, 3, 4, "sqr");
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 3, -99, -99, 4, 1, 6, 0, 4, 2, 6, 0, 0, 3, 6, 0 ] ];
        assert.deepEqual(actual, expected);
      });
      it.skip("xyc", function() {
      });
      it.skip("pairs", function() {
      });
      it("cutoff", function() {
        env = cc.global.Env.cutoff();
        actual   = env.asMultichannelArray();
        expected = [ [ 1, 1, 0, -99, 0, 0.1, 1, 0 ] ];
        assert.deepEqual(actual, expected);
      });
      it("dadsr", function() {
        env = cc.global.Env.dadsr();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 4, 3, -99, 0, 0.1, 5, -4, 1, 0.01, 5, -4, 0.5, 0.3, 5, -4, 0, 1, 5, -4 ] ];
        assert.deepEqual(actual, expected);
      });
      it("adsr", function() {
        env = cc.global.Env.adsr();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 3, 2, -99, 1, 0.01, 5, -4, 0.5, 0.3, 5, -4, 0, 1, 5, -4 ] ];
        assert.deepEqual(actual, expected);
      });
      it("asr", function() {
        env = cc.global.Env.asr();
        actual   = env.asMultichannelArray();
        expected = [ [ 0, 2, 1, -99, 1, 0.01, 5, -4, 0, 1, 5, -4 ] ];
        assert.deepEqual(actual, expected);
      });
    });
  });
  
  module.exports = {};

});
