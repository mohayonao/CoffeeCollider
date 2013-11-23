define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../../testTools");
  
  var cc    = require("../cc");
  var ugen  = require("./ugen");
  var UGen  = ugen.UGen;
  
  describe("lang/ugen/ugen.js", function() {
    var actual, expected;
    var _createMulAdd, _createUnaryOpUGen, _createBinaryOpUGen;
    before(function() {
      _createMulAdd = cc.createMulAdd;
      cc.createMulAdd = function(ugen, a, b) {
        return ugen.inputs[0] * a + b;
      };
      _createUnaryOpUGen = cc.createUnaryOpUGen;
      cc.createUnaryOpUGen = function(selector, a) {
        return {selector:selector, a:a};
      };
      _createBinaryOpUGen = cc.createBinaryOpUGen;
      cc.createBinaryOpUGen = function(selector, a, b) {
        return {selector:selector, a:a, b:b};
      };

      ugen.register("Test", {
        $ar: {
          defaults: "val1=1,val2=2",
          ctor: function(val1, val2) {
            return this.init(C.AUDIO, val1, val2);
          }
        },
        $kr: {
          defaults: "val1=1,val2=2",
          ctor: function(val1, val2) {
            return this.init(C.CONTROL, val1, val2);
          }
        },
      });
    });
    after(function() {
      cc.createMulAdd = _createMulAdd;
      cc.createUnaryOpUGen  = _createUnaryOpUGen;
      cc.createBinaryOpUGen = _createBinaryOpUGen;
    });
    describe("UGen", function() {
      it("create", function() {
        var instance = cc.global.Test.ar();
        assert.instanceOf(instance, UGen);
        assert.equal("Test", instance.klassName);
      });
      it("inputs", function() {
        var instance = cc.global.Test.ar();
        assert.equal(2, instance.numOfInputs);
        assert.deepEqual([1, 2], instance.inputs);
      });
      it("rate", function() {
        assert.equal(C.AUDIO  , cc.global.Test.ar().rate);
        assert.equal(C.CONTROL, cc.global.Test.kr().rate);
      });
      it("args", function() {
        var instance = cc.global.Test.ar(10, {tag:"TEST"});
        assert.equal(2, instance.numOfInputs);
        assert.deepEqual([10, 2], instance.inputs);
        assert.equal("TEST", instance.tag);
      });
      it("uop", function() {
        var instance = cc.global.Test.ar(10);
        actual = instance.abs();
        assert.equal(actual.selector, "abs");
        assert.equal(actual.a, instance);
      });
      it("bop", function() {
        var instance = cc.global.Test.ar(10);
        actual = instance.max(100);
        assert.equal(actual.selector, "max");
        assert.equal(actual.a, instance);
        assert.equal(actual.b, 100);
      });
      it("madd", function() {
        var instance = cc.global.Test.ar(10);
        actual = instance.madd(100, 50);
        assert.equal(actual, 10 * 100 + 50);
      });
      it("range", function() {
        testTools.useFourArithmeticOperations(function() {
          var instance = cc.global.Test.ar(0.75);
          actual = instance.range(-100, 100);
          assert.equal(actual, 75);

          instance.signalRange = C.UNIPOLAR;
          actual = instance.range(-100, 100);
          assert.equal(actual, 50);
        });
      });
      it.skip("exprange", function() {
      });
      it.skip("curverange", function() {
      });
      it.skip("unipolar", function() {
      });
      it.skip("bipolar", function() {
      });
      it.skip("clip", function() {
      });
      it.skip("fold", function() {
      });
      it.skip("wrap", function() {
      });
      it.skip("blend", function() {
      });
      it.skip("lag", function() {
      });
      it.skip("lag2", function() {
      });
      it.skip("lag3", function() {
      });
      it.skip("lagud", function() {
      });
      it.skip("lag2ud", function() {
      });
      it.skip("lag3ud", function() {
      });
      it.skip("varlag", function() {
      });
      it.skip("slew", function() {
      });
      it.skip("prune", function() {
      });
      it.skip("linlin", function() {
      });
      it.skip("linexp", function() {
      });
      it.skip("explin", function() {
      });
      it.skip("expexp", function() {
      });
      it.skip("lincurve", function() {
      });
      it.skip("curvelin", function() {
      });
      it.skip("bilin", function() {
      });
    });
  });

});
