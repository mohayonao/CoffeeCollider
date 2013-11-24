define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc   = require("../cc");
  var unit = require("./unit");
  var uop  = require("./uop");
  var ops  = require("../../common/ops");
   
  describe("server/unit/uop.js", function() {
    describe("calcFunc", function() {
      Object.keys(uop.calcFunc).forEach(function(selector) {
        var specialIndex = ops.UNARY_OPS_MAP.indexOf(selector);
        it(selector + "("+specialIndex+")", function() {
          var func = uop.calcFunc[selector];
          assert.isFalse(isNaN(func(-1)));
          assert.isFalse(isNaN(func( 0)));
          assert.isFalse(isNaN(func(+1)));
        });
      });
    });
    describe("process", function() {
      var that, func;
      before(function() {
        that = {
          inputs : [
            new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8])
          ]
        };
        func = function(a) {
          return a * 2;
        };
      });
      beforeEach(function() {
        that.outputs = [ new Float32Array(8) ];
      });
      it("unary_k", function() {
        uop.unary_k(func).call(that, 8);
        assert.equal(that.outputs[0][0], 2);
        assert.equal(that.outputs[0][1], 0);
        assert.equal(that.outputs[0][2], 0);
        assert.equal(that.outputs[0][3], 0);
        assert.equal(that.outputs[0][4], 0);
        assert.equal(that.outputs[0][5], 0);
        assert.equal(that.outputs[0][6], 0);
        assert.equal(that.outputs[0][7], 0);
      });
      it("unary_a", function() {
        uop.unary_a(func).call(that, 8);
        assert.equal(that.outputs[0][0],  2);
        assert.equal(that.outputs[0][1],  4);
        assert.equal(that.outputs[0][2],  6);
        assert.equal(that.outputs[0][3],  8);
        assert.equal(that.outputs[0][4], 10);
        assert.equal(that.outputs[0][5], 12);
        assert.equal(that.outputs[0][6], 14);
        assert.equal(that.outputs[0][7], 16);
      });
    });
    describe("unit", function() {
      var specialIndex;
      before(function() {
        specialIndex = ops.UNARY_OPS_MAP.length;
        ops.UNARY_OPS_MAP[specialIndex] = "uopTest";
        cc.getRateInstance = function() {
          return { bufLength: 64 };
        };
      });
      beforeEach(function() {
        uop.calcFunc.uopTest = function(a) {
          return a + 1;
        };
      });
      it("AUDIO", function() {
        uop.calcFunc.uopTest.a = uop.unary_a(uop.calcFunc.uopTest);
        var u = cc.createUnit({}, [
          "UnaryOpUGen", C.AUDIO, specialIndex, [ 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.AUDIO;
        u.inputs[0]  = new Float32Array([0,1,2,3,4,5,6,7]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1);
        assert.equal(u.outputs[0][1], 2);
        assert.equal(u.outputs[0][2], 3);
        assert.equal(u.outputs[0][3], 4);
        assert.equal(u.outputs[0][4], 5);
        assert.equal(u.outputs[0][5], 6);
        assert.equal(u.outputs[0][6], 7);
        assert.equal(u.outputs[0][7], 8);
      });
      it("CONTROL", function() {
        uop.calcFunc.uopTest.k = uop.unary_k(uop.calcFunc.uopTest);
        var u = cc.createUnit({}, [
          "UnaryOpUGen", C.CONTROL, specialIndex, [ 0,0 ], [ C.CONTROL ]
        ]);
        u.inRates[0] = C.CONTROL;
        u.inputs[0]  = new Float32Array([0]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1);
        assert.equal(u.outputs[0][1], 0);
        assert.equal(u.outputs[0][2], 0);
        assert.equal(u.outputs[0][3], 0);
        assert.equal(u.outputs[0][4], 0);
        assert.equal(u.outputs[0][5], 0);
        assert.equal(u.outputs[0][6], 0);
        assert.equal(u.outputs[0][7], 0);
      });
      it("SCALAR", function() {
        var u = cc.createUnit({}, [
          "UnaryOpUGen", C.SCALAR, specialIndex, [ 0,0 ], [ C.SCALAR ]
        ]);
        u.inRates[0] = C.SCALAR;
        u.inputs[0]  = new Float32Array([0]);
        u.init();
        assert.isNotFunction(u.process);
        assert.equal(u.outputs[0][0], 1);
        assert.equal(u.outputs[0][1], 0);
        assert.equal(u.outputs[0][2], 0);
        assert.equal(u.outputs[0][3], 0);
        assert.equal(u.outputs[0][4], 0);
        assert.equal(u.outputs[0][5], 0);
        assert.equal(u.outputs[0][6], 0);
        assert.equal(u.outputs[0][7], 0);
      });
      it("undefined", function() {
        cc.console = {
          warn: function(str) {
            cc.console.warn.result = str;
          }
        };
        var u = cc.createUnit({}, [
          "UnaryOpUGen", C.AUDIO, -1, [ 0,0 ], [ C.AUDIO ]
        ]);
        cc.console.warn.result = null;
        u.init();
        assert.isString(cc.console.warn.result);
      });
    });
  });

});
