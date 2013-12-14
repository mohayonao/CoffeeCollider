define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var bus = require("./bus");
  var cc  = require("./cc");
  
  describe("lang/bus.js", function() {
    var instance, actual, expected;
    describe("Bus", function() {
      beforeEach(function() {
        cc.resetBus();
      });
      it("create", function() {
        instance = cc.global.Bus();
        assert.instanceOf(instance, bus.Bus);
        assert.isTrue(cc.instanceOfBus(instance));
      });
      it("*control", function() {
        instance = cc.global.Bus.control(10);
        assert.equal(instance.rate , C.CONTROL);
        assert.equal(instance.numChannels, 10);
      });
      it("*control with not-number", function() {
        instance = cc.global.Bus.control("10");
        assert.equal(instance.numChannels, 0);
      });      
      it("*control failed", function() {
        assert.throws(function() {
          cc.global.Bus.control(C.CONTROL_BUS_LEN + 1);
        });
      });
      it("*audio", function() {
        instance = cc.global.Bus.audio(10);
        assert.equal(instance.rate , C.AUDIO);
        assert.equal(instance.numChannels, 10);
      });
      it("*audio with not-number", function() {
        instance = cc.global.Bus.audio("10");
        assert.equal(instance.numChannels, 0);
      });      
      it("*audio failed", function() {
        assert.throws(function() {
          cc.global.Bus.audio(C.AUDIO_BUS_LEN + 1);
        });
      });
      it("asUGenInput", function() {
        instance = cc.global.Bus.audio(10);
        assert.equal(instance.asUGenInput(), instance.index);
      });
    });
  });
  
  module.exports = {};

});
