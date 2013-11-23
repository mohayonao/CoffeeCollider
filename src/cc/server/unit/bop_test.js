define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc   = require("../cc");
  var unit = require("./unit");
  var bop  = require("./bop");
  var ops  = require("../../common/ops");
  
  describe("server/unit/bop.js", function() {
    describe("calcFunc", function() {
      Object.keys(bop.calcFunc).forEach(function(selector) {
        var specialIndex = ops.BINARY_OP_UGEN_MAP.indexOf(selector);
        it(selector + "("+specialIndex+")", function() {
          var func = bop.calcFunc[selector];
          assert.isFalse(isNaN(func(-1, -1)));
          assert.isFalse(isNaN(func(-1,  0)));
          assert.isFalse(isNaN(func(-1, +1)));
          assert.isFalse(isNaN(func( 0, -1)));
          assert.isFalse(isNaN(func( 0,  0)));
          assert.isFalse(isNaN(func( 0, +1)));
          assert.isFalse(isNaN(func(+1, -1)));
          assert.isFalse(isNaN(func(+1,  0)));
          assert.isFalse(isNaN(func(+1, +1)));
        });
      });
    });
    describe("process", function() {
      var that, func;
      before(function() {
        func = function(a, b) {
          return a + b;
        };
      });
      beforeEach(function() {
        that = {
          inputs : [
            new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]),
            new Float32Array([10,20,30,40,50,60,70,80])
          ],
          outputs: [ new Float32Array(8) ],
          rate: { slopeFactor:1/8 }
        };
        that._a = that.inputs[0][0];
        that._b = that.inputs[1][0];
      });
      it("binary_aa", function() {
        bop.binary_aa(func).call(that, 8);
        assert.equal(that.outputs[0][0], 11);
        assert.equal(that.outputs[0][1], 22);
        assert.equal(that.outputs[0][2], 33);
        assert.equal(that.outputs[0][3], 44);
        assert.equal(that.outputs[0][4], 55);
        assert.equal(that.outputs[0][5], 66);
        assert.equal(that.outputs[0][6], 77);
        assert.equal(that.outputs[0][7], 88);
      });
      it("binary_ak", function() {
        that._b = 0; // 0 -> 10
        bop.binary_ak(func).call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 0.00);
        assert.equal(that.outputs[0][1], 2 + 1.25);
        assert.equal(that.outputs[0][2], 3 + 2.50);
        assert.equal(that.outputs[0][3], 4 + 3.75);
        assert.equal(that.outputs[0][4], 5 + 5.00);
        assert.equal(that.outputs[0][5], 6 + 6.25);
        assert.equal(that.outputs[0][6], 7 + 7.50);
        assert.equal(that.outputs[0][7], 8 + 8.75);
      });
      it("binary_ai", function() {
        bop.binary_ai(func).call(that, 8);
        assert.equal(that.outputs[0][0], 11);
        assert.equal(that.outputs[0][1], 12);
        assert.equal(that.outputs[0][2], 13);
        assert.equal(that.outputs[0][3], 14);
        assert.equal(that.outputs[0][4], 15);
        assert.equal(that.outputs[0][5], 16);
        assert.equal(that.outputs[0][6], 17);
        assert.equal(that.outputs[0][7], 18);
      });
      it("binary_ka", function() {
        that._a = 0; // 0 -> 1
        bop.binary_ka(func).call(that, 8);
        assert.equal(that.outputs[0][0], 10.000);
        assert.equal(that.outputs[0][1], 20.125);
        assert.equal(that.outputs[0][2], 30.250);
        assert.equal(that.outputs[0][3], 40.375);
        assert.equal(that.outputs[0][4], 50.500);
        assert.equal(that.outputs[0][5], 60.625);
        assert.equal(that.outputs[0][6], 70.750);
        assert.equal(that.outputs[0][7], 80.875);
      });
      it("binary_kk", function() {
        bop.binary_kk(func).call(that, 8);
        assert.equal(that.outputs[0][0], 11);
        assert.equal(that.outputs[0][1],  0);
        assert.equal(that.outputs[0][2],  0);
        assert.equal(that.outputs[0][3],  0);
        assert.equal(that.outputs[0][4],  0);
        assert.equal(that.outputs[0][5],  0);
        assert.equal(that.outputs[0][6],  0);
        assert.equal(that.outputs[0][7],  0);
      });
      it("binary_ia", function() {
        bop.binary_ia(func).call(that, 8);
        assert.equal(that.outputs[0][0], 11);
        assert.equal(that.outputs[0][1], 21);
        assert.equal(that.outputs[0][2], 31);
        assert.equal(that.outputs[0][3], 41);
        assert.equal(that.outputs[0][4], 51);
        assert.equal(that.outputs[0][5], 61);
        assert.equal(that.outputs[0][6], 71);
        assert.equal(that.outputs[0][7], 81);
      });
      it("+.aa", function() {
        bop.calcFunc["+"].aa.call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 10);
        assert.equal(that.outputs[0][1], 2 + 20);
        assert.equal(that.outputs[0][2], 3 + 30);
        assert.equal(that.outputs[0][3], 4 + 40);
        assert.equal(that.outputs[0][4], 5 + 50);
        assert.equal(that.outputs[0][5], 6 + 60);
        assert.equal(that.outputs[0][6], 7 + 70);
        assert.equal(that.outputs[0][7], 8 + 80);
      });
      it("+.ak", function() {
        that._b = 0; // 0 -> 10
        bop.calcFunc["+"].ak.call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 0.00);
        assert.equal(that.outputs[0][1], 2 + 1.25);
        assert.equal(that.outputs[0][2], 3 + 2.50);
        assert.equal(that.outputs[0][3], 4 + 3.75);
        assert.equal(that.outputs[0][4], 5 + 5.00);
        assert.equal(that.outputs[0][5], 6 + 6.25);
        assert.equal(that.outputs[0][6], 7 + 7.50);
        assert.equal(that.outputs[0][7], 8 + 8.75);
      });
      it("+.ai", function() {
        bop.calcFunc["+"].ai.call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 10);
        assert.equal(that.outputs[0][1], 2 + 10);
        assert.equal(that.outputs[0][2], 3 + 10);
        assert.equal(that.outputs[0][3], 4 + 10);
        assert.equal(that.outputs[0][4], 5 + 10);
        assert.equal(that.outputs[0][5], 6 + 10);
        assert.equal(that.outputs[0][6], 7 + 10);
        assert.equal(that.outputs[0][7], 8 + 10);
      });
      it("+.ka", function() {
        that._a = 0; // 0 -> 1
        bop.calcFunc["+"].ka.call(that, 8);
        assert.equal(that.outputs[0][0], 0.000 + 10);
        assert.equal(that.outputs[0][1], 0.125 + 20);
        assert.equal(that.outputs[0][2], 0.250 + 30);
        assert.equal(that.outputs[0][3], 0.375 + 40);
        assert.equal(that.outputs[0][4], 0.500 + 50);
        assert.equal(that.outputs[0][5], 0.625 + 60);
        assert.equal(that.outputs[0][6], 0.750 + 70);
        assert.equal(that.outputs[0][7], 0.875 + 80);
      });
      it("+.kk", function() {
        bop.calcFunc["+"].kk.call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 10);
        assert.equal(that.outputs[0][1], 0);
        assert.equal(that.outputs[0][2], 0);
        assert.equal(that.outputs[0][3], 0);
        assert.equal(that.outputs[0][4], 0);
        assert.equal(that.outputs[0][5], 0);
        assert.equal(that.outputs[0][6], 0);
        assert.equal(that.outputs[0][7], 0);
      });
      it("+.ia", function() {
        bop.calcFunc["+"].ia.call(that, 8);
        assert.equal(that.outputs[0][0], 1 + 10);
        assert.equal(that.outputs[0][1], 1 + 20);
        assert.equal(that.outputs[0][2], 1 + 30);
        assert.equal(that.outputs[0][3], 1 + 40);
        assert.equal(that.outputs[0][4], 1 + 50);
        assert.equal(that.outputs[0][5], 1 + 60);
        assert.equal(that.outputs[0][6], 1 + 70);
        assert.equal(that.outputs[0][7], 1 + 80);
      });
      it("-.aa", function() {
        bop.calcFunc["-"].aa.call(that, 8);
        assert.equal(that.outputs[0][0], 1 - 10);
        assert.equal(that.outputs[0][1], 2 - 20);
        assert.equal(that.outputs[0][2], 3 - 30);
        assert.equal(that.outputs[0][3], 4 - 40);
        assert.equal(that.outputs[0][4], 5 - 50);
        assert.equal(that.outputs[0][5], 6 - 60);
        assert.equal(that.outputs[0][6], 7 - 70);
        assert.equal(that.outputs[0][7], 8 - 80);
      });
      it("-.ak", function() {
        that._b = 0; // 0 -> 10
        bop.calcFunc["-"].ak.call(that, 8);
        assert.equal(that.outputs[0][0], 1 - 0.00);
        assert.equal(that.outputs[0][1], 2 - 1.25);
        assert.equal(that.outputs[0][2], 3 - 2.50);
        assert.equal(that.outputs[0][3], 4 - 3.75);
        assert.equal(that.outputs[0][4], 5 - 5.00);
        assert.equal(that.outputs[0][5], 6 - 6.25);
        assert.equal(that.outputs[0][6], 7 - 7.50);
        assert.equal(that.outputs[0][7], 8 - 8.75);
      });
      it("-.ai", function() {
        bop.calcFunc["-"].ai.call(that, 8);
        assert.equal(that.outputs[0][0], 1 - 10);
        assert.equal(that.outputs[0][1], 2 - 10);
        assert.equal(that.outputs[0][2], 3 - 10);
        assert.equal(that.outputs[0][3], 4 - 10);
        assert.equal(that.outputs[0][4], 5 - 10);
        assert.equal(that.outputs[0][5], 6 - 10);
        assert.equal(that.outputs[0][6], 7 - 10);
        assert.equal(that.outputs[0][7], 8 - 10);
      });
      it("-.ka", function() {
        that._a = 0; // 0 -> 1
        bop.calcFunc["-"].ka.call(that, 8);
        assert.equal(that.outputs[0][0], 0.000 - 10);
        assert.equal(that.outputs[0][1], 0.125 - 20);
        assert.equal(that.outputs[0][2], 0.250 - 30);
        assert.equal(that.outputs[0][3], 0.375 - 40);
        assert.equal(that.outputs[0][4], 0.500 - 50);
        assert.equal(that.outputs[0][5], 0.625 - 60);
        assert.equal(that.outputs[0][6], 0.750 - 70);
        assert.equal(that.outputs[0][7], 0.875 - 80);
      });
      it("-.kk", function() {
        bop.calcFunc["-"].kk.call(that, 8);
        assert.equal(that.outputs[0][0], 1 - 10);
        assert.equal(that.outputs[0][1], 0);
        assert.equal(that.outputs[0][2], 0);
        assert.equal(that.outputs[0][3], 0);
        assert.equal(that.outputs[0][4], 0);
        assert.equal(that.outputs[0][5], 0);
        assert.equal(that.outputs[0][6], 0);
        assert.equal(that.outputs[0][7], 0);
      });
      it("-.ia", function() {
        bop.calcFunc["-"].ia.call(that, 8);
        assert.equal(that.outputs[0][0], 1 - 10);
        assert.equal(that.outputs[0][1], 1 - 20);
        assert.equal(that.outputs[0][2], 1 - 30);
        assert.equal(that.outputs[0][3], 1 - 40);
        assert.equal(that.outputs[0][4], 1 - 50);
        assert.equal(that.outputs[0][5], 1 - 60);
        assert.equal(that.outputs[0][6], 1 - 70);
        assert.equal(that.outputs[0][7], 1 - 80);
      });
      it("*.aa", function() {
        bop.calcFunc["*"].aa.call(that, 8);
        assert.equal(that.outputs[0][0], 1 * 10);
        assert.equal(that.outputs[0][1], 2 * 20);
        assert.equal(that.outputs[0][2], 3 * 30);
        assert.equal(that.outputs[0][3], 4 * 40);
        assert.equal(that.outputs[0][4], 5 * 50);
        assert.equal(that.outputs[0][5], 6 * 60);
        assert.equal(that.outputs[0][6], 7 * 70);
        assert.equal(that.outputs[0][7], 8 * 80);
      });
      it("*.ak", function() {
        that._b = 0; // 0 -> 10
        bop.calcFunc["*"].ak.call(that, 8);
        assert.equal(that.outputs[0][0], 1 * 0.00);
        assert.equal(that.outputs[0][1], 2 * 1.25);
        assert.equal(that.outputs[0][2], 3 * 2.50);
        assert.equal(that.outputs[0][3], 4 * 3.75);
        assert.equal(that.outputs[0][4], 5 * 5.00);
        assert.equal(that.outputs[0][5], 6 * 6.25);
        assert.equal(that.outputs[0][6], 7 * 7.50);
        assert.equal(that.outputs[0][7], 8 * 8.75);
      });
      it("*.ai", function() {
        bop.calcFunc["*"].ai.call(that, 8);
        assert.equal(that.outputs[0][0], 1 * 10);
        assert.equal(that.outputs[0][1], 2 * 10);
        assert.equal(that.outputs[0][2], 3 * 10);
        assert.equal(that.outputs[0][3], 4 * 10);
        assert.equal(that.outputs[0][4], 5 * 10);
        assert.equal(that.outputs[0][5], 6 * 10);
        assert.equal(that.outputs[0][6], 7 * 10);
        assert.equal(that.outputs[0][7], 8 * 10);
      });
      it("*.ka", function() {
        that._a = 0; // 0 -> 1
        bop.calcFunc["*"].ka.call(that, 8);
        assert.equal(that.outputs[0][0], 0.000 * 10);
        assert.equal(that.outputs[0][1], 0.125 * 20);
        assert.equal(that.outputs[0][2], 0.250 * 30);
        assert.equal(that.outputs[0][3], 0.375 * 40);
        assert.equal(that.outputs[0][4], 0.500 * 50);
        assert.equal(that.outputs[0][5], 0.625 * 60);
        assert.equal(that.outputs[0][6], 0.750 * 70);
        assert.equal(that.outputs[0][7], 0.875 * 80);
      });
      it("*.kk", function() {
        bop.calcFunc["*"].kk.call(that, 8);
        assert.equal(that.outputs[0][0], 1 * 10);
        assert.equal(that.outputs[0][1], 0);
        assert.equal(that.outputs[0][2], 0);
        assert.equal(that.outputs[0][3], 0);
        assert.equal(that.outputs[0][4], 0);
        assert.equal(that.outputs[0][5], 0);
        assert.equal(that.outputs[0][6], 0);
        assert.equal(that.outputs[0][7], 0);
      });
      it("*.ia", function() {
        bop.calcFunc["*"].ia.call(that, 8);
        assert.equal(that.outputs[0][0], 1 * 10);
        assert.equal(that.outputs[0][1], 1 * 20);
        assert.equal(that.outputs[0][2], 1 * 30);
        assert.equal(that.outputs[0][3], 1 * 40);
        assert.equal(that.outputs[0][4], 1 * 50);
        assert.equal(that.outputs[0][5], 1 * 60);
        assert.equal(that.outputs[0][6], 1 * 70);
        assert.equal(that.outputs[0][7], 1 * 80);
      });
    });
    describe("unit", function() {
      var specialIndex;
      before(function() {
        specialIndex = ops.BINARY_OP_UGEN_MAP.length;
        ops.BINARY_OP_UGEN_MAP[specialIndex] = "bopTest";
        cc.getRateInstance = function() {
          return { bufLength:8, slopeFactor:1/8 };
        };
      });
      beforeEach(function() {
        bop.calcFunc.bopTest = function(a, b) {
          return a + b + 1;
        };
      });
      it("AUDIO x AUDIO", function() {
        bop.calcFunc.bopTest.aa = bop.binary_aa(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.AUDIO;
        u.inRates[1] = C.AUDIO;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 2 + 20 + 1);
        assert.equal(u.outputs[0][2], 3 + 30 + 1);
        assert.equal(u.outputs[0][3], 4 + 40 + 1);
        assert.equal(u.outputs[0][4], 5 + 50 + 1);
        assert.equal(u.outputs[0][5], 6 + 60 + 1);
        assert.equal(u.outputs[0][6], 7 + 70 + 1);
        assert.equal(u.outputs[0][7], 8 + 80 + 1);
      });
      it("AUDIO x CONTROL", function() {
        bop.calcFunc.bopTest.ak = bop.binary_ak(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.AUDIO;
        u.inRates[1] = C.CONTROL;
        u.inputs[0]  = new Float32Array([1,2,3,4,5,6,7,8]);
        u.inputs[1]  = new Float32Array([0,0,0,0,0,0,0,0]);
        u.init();
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 0.00 + 1);
        assert.equal(u.outputs[0][1], 2 + 1.25 + 1);
        assert.equal(u.outputs[0][2], 3 + 2.50 + 1);
        assert.equal(u.outputs[0][3], 4 + 3.75 + 1);
        assert.equal(u.outputs[0][4], 5 + 5.00 + 1);
        assert.equal(u.outputs[0][5], 6 + 6.25 + 1);
        assert.equal(u.outputs[0][6], 7 + 7.50 + 1);
        assert.equal(u.outputs[0][7], 8 + 8.75 + 1);
      });
      it("AUDIO x SCALAR", function() {
        bop.calcFunc.bopTest.ai = bop.binary_ai(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.AUDIO;
        u.inRates[1] = C.SCALAR;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 2 + 10 + 1);
        assert.equal(u.outputs[0][2], 3 + 10 + 1);
        assert.equal(u.outputs[0][3], 4 + 10 + 1);
        assert.equal(u.outputs[0][4], 5 + 10 + 1);
        assert.equal(u.outputs[0][5], 6 + 10 + 1);
        assert.equal(u.outputs[0][6], 7 + 10 + 1);
        assert.equal(u.outputs[0][7], 8 + 10 + 1);
      });
      it("CONTROL x AUDIO", function() {
        bop.calcFunc.bopTest.ka = bop.binary_ka(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.CONTROL;
        u.inRates[1] = C.AUDIO;
        u.inputs[0]  = new Float32Array([ 0, 0, 0, 0, 0, 0, 0, 0]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        u.inputs[0]  = new Float32Array([1,2,3,4,5,6,7,8]);
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 0.000 + 10 + 1);
        assert.equal(u.outputs[0][1], 0.125 + 20 + 1);
        assert.equal(u.outputs[0][2], 0.250 + 30 + 1);
        assert.equal(u.outputs[0][3], 0.375 + 40 + 1);
        assert.equal(u.outputs[0][4], 0.500 + 50 + 1);
        assert.equal(u.outputs[0][5], 0.625 + 60 + 1);
        assert.equal(u.outputs[0][6], 0.750 + 70 + 1);
        assert.equal(u.outputs[0][7], 0.875 + 80 + 1);
      });
      it("CONTROL x CONTROL", function() {
        bop.calcFunc.bopTest.kk = bop.binary_kk(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
        ]);
        u.inRates[0] = C.CONTROL;
        u.inRates[1] = C.CONTROL;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 0);
        assert.equal(u.outputs[0][2], 0);
        assert.equal(u.outputs[0][3], 0);
        assert.equal(u.outputs[0][4], 0);
        assert.equal(u.outputs[0][5], 0);
        assert.equal(u.outputs[0][6], 0);
        assert.equal(u.outputs[0][7], 0);
      });
      it("CONTROL x SCALAR", function() {
        bop.calcFunc.bopTest.kk = bop.binary_kk(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
        ]);
        u.inRates[0] = C.CONTROL;
        u.inRates[1] = C.SCALAR;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 0);
        assert.equal(u.outputs[0][2], 0);
        assert.equal(u.outputs[0][3], 0);
        assert.equal(u.outputs[0][4], 0);
        assert.equal(u.outputs[0][5], 0);
        assert.equal(u.outputs[0][6], 0);
        assert.equal(u.outputs[0][7], 0);
      });
      it("SCALAR x AUDIO", function() {
        bop.calcFunc.bopTest.ia = bop.binary_ia(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
        ]);
        u.inRates[0] = C.SCALAR;
        u.inRates[1] = C.AUDIO;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 1 + 20 + 1);
        assert.equal(u.outputs[0][2], 1 + 30 + 1);
        assert.equal(u.outputs[0][3], 1 + 40 + 1);
        assert.equal(u.outputs[0][4], 1 + 50 + 1);
        assert.equal(u.outputs[0][5], 1 + 60 + 1);
        assert.equal(u.outputs[0][6], 1 + 70 + 1);
        assert.equal(u.outputs[0][7], 1 + 80 + 1);
      });
      it("SCALAR x CONTROL", function() {
        bop.calcFunc.bopTest.kk = bop.binary_kk(bop.calcFunc.bopTest);
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
        ]);
        u.inRates[0] = C.SCALAR;
        u.inRates[1] = C.CONTROL;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isFunction(u.process);
        u.process(8);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
        assert.equal(u.outputs[0][1], 0);
        assert.equal(u.outputs[0][2], 0);
        assert.equal(u.outputs[0][3], 0);
        assert.equal(u.outputs[0][4], 0);
        assert.equal(u.outputs[0][5], 0);
        assert.equal(u.outputs[0][6], 0);
        assert.equal(u.outputs[0][7], 0);
      });
      it("SCALAR x SCALAR", function() {
        var u = cc.createUnit({}, [
          "BinaryOpUGen", C.SCALAR, specialIndex, [ 0,0, 0,0 ], [ C.SCALAR ]
        ]);
        u.inRates[0] = C.SCALAR;
        u.inRates[1] = C.SCALAR;
        u.inputs[0]  = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8]);
        u.inputs[1]  = new Float32Array([10,20,30,40,50,60,70,80]);
        u.init();
        assert.isNotFunction(u.process);
        assert.equal(u.outputs[0][0], 1 + 10 + 1);
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
          "BinaryOpUGen", C.AUDIO, -1, [ 0,0 ], [ C.AUDIO ]
        ]);
        cc.console.warn.result = null;
        u.init();
        assert.isString(cc.console.warn.result);
      });
    });
  });

});
