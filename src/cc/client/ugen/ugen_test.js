define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("../cc");
  var ugen = require("./ugen");
  
  cc.registerUGen("Test", {
    ar: {
      defaults: "val1=1,val2=2",
      ctor: function(val1, val2) {
        return this.init(C.AUDIO, val1, val2);
      }
    },
    kr: {
      defaults: "val1=1,val2=2",
      ctor: function(val1, val2) {
        return this.init(C.CONTROL, val1, val2);
      }
    },
  });
  
  describe("ugen.js", function() {
    before(function() {
      ugen.use();
    });
    describe("UGen", function() {
      it("create", function() {
        var instance = Test.ar();
        assert.instanceOf(instance, ugen.UGen);
        assert.equal("Test", instance.klassName);
      });
      it("inputs", function() {
        var instance = Test.ar();
        assert.equal(2, instance.numOfInputs);
        assert.deepEqual([1, 2], instance.inputs);
      });
      it("rate", function() {
        assert.equal(C.AUDIO  , Test.ar().rate);
        assert.equal(C.CONTROL, Test.kr().rate);
      });
      it("args", function() {
        var instance = Test.ar(10, {tag:"TEST"});
        assert.equal(2, instance.numOfInputs);
        assert.deepEqual([10, 2], instance.inputs);
        assert.equal("TEST", instance.tag);
      });
    });
    describe("MultiOutUGen", function() {
      it("case 1", function() {
        var values = [ 1 ];
        var instance = cc.createControl(C.CONTROL).init(values);
        assert.instanceOf(instance, ugen.OutputProxy);
      });
      it("case 2", function() {
        var values = [ 1, 2, 3 ];
        var instance = cc.createControl(C.CONTROL).init(values);
        assert.isArray(instance);
        assert.equal(values.length, instance.length);
      });
    });
  });

});
