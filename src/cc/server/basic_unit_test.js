define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc   = require("./cc");
  var unit = require("./unit");
  var basic_unit = require("./basic_unit");
  var ops  = require("../common/ops");
  
  describe("server/basic_unit.js", function() {
    var actual, expected;
    
    testTools.mock("server");
    
    describe("unary operators", function() {
      describe("uopFunc", function() {
        Object.keys(basic_unit.uopFunc).forEach(function(selector) {
          var specialIndex = ops.UNARY_OPS_MAP.indexOf(selector);
          it(selector + "("+specialIndex+")", function() {
            var func = basic_unit.uopFunc[selector];
            assert.isFalse(isNaN(func(-1)));
            assert.isFalse(isNaN(func( 0)));
            assert.isFalse(isNaN(func(+1)));
          });
        });
      });
      describe("process", function() {
        var that, func;
        beforeEach(function() {
          that = {
            inputs : [ new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8 ]) ],
            outputs: [ new Float32Array([ 0, 0, 0, 0, 0, 0, 0, 0 ]) ],
          };
          func = function(a) { return a * 2; };
        });
        it("unary_a", function() {
          basic_unit.unary_a(func).call(that, 8);
          assert.equal(that.outputs[0][0],  2);
          assert.equal(that.outputs[0][1],  4);
          assert.equal(that.outputs[0][2],  6);
          assert.equal(that.outputs[0][3],  8);
          assert.equal(that.outputs[0][4], 10);
          assert.equal(that.outputs[0][5], 12);
          assert.equal(that.outputs[0][6], 14);
          assert.equal(that.outputs[0][7], 16);
        });
        it("unary_k", function() {
          basic_unit.unary_k(func).call(that, 1);
          assert.equal(that.outputs[0][0], 2);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("unary_d (AUDIO)", function() {
          that.fromUnits = [
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            }
          ];
          actual = basic_unit.unary_d(func).call(that, 8);
          assert.equal(that.outputs[0][0], 16);
        });
        it("unary_d (CONTROL)", function() {
          that.fromUnits = [
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            }
          ];
          actual = basic_unit.unary_d(func).call(that, 1);
          assert.equal(that.outputs[0][0], 2);
        });
        it("unary_d (SCALAR)", function() {
          that.fromUnits = [
            null // constant value
          ];
          actual = basic_unit.unary_d(func).call(that, 1);
          assert.equal(that.outputs[0][0], 2);
        });
        it("unary_d (DEMAND)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = 100;
                passed += 1;
              }
            }
          ];
          actual = basic_unit.unary_d(func).call(that, 1);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 200);
        });
        it("unary_d (DEMAND:NaN)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = NaN;
                passed += 1;
              }
            }
          ];
          actual = basic_unit.unary_d(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("unary_d (reset)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process: function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            }
          ];
          basic_unit.unary_d(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("unary_d (reset:not demand)", function() {
          that.fromUnits = [
            {
              calcRate: C.CONTROL,
              process: function() {
                throw "should not be called"
              }
            }
          ];
          assert.doesNotThrow(function() {
            basic_unit.unary_d(func).call(that, 0);
          });
        });
      });
      describe("unit.process", function() {
        var specialIndex;
        before(function() {
          specialIndex = ops.UNARY_OPS_MAP.length;
          ops.UNARY_OPS_MAP[specialIndex] = "uopTest";
          basic_unit.uopFunc.uopTest = function(a) {
            return a * 2;
          };
          basic_unit.uopFunc.uopTest.a = basic_unit.unary_a(basic_unit.uopFunc.uopTest);
          basic_unit.uopFunc.uopTest.k = basic_unit.unary_k(basic_unit.uopFunc.uopTest);
          basic_unit.uopFunc.uopTest.d = basic_unit.unary_k(basic_unit.uopFunc.uopTest);
        });
        it("AUDIO", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "UnaryOpUGen", C.AUDIO, specialIndex, [ 0,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.AUDIO;
          u.inputs[0]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.uopFunc.uopTest.a);
        });
        it("CONTROL", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "UnaryOpUGen", C.CONTROL, specialIndex, [ 0,0 ], [ C.CONTROL ]
          ]);
          u.inRates[0] = C.CONTROL;
          u.inputs[0]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.uopFunc.uopTest.k);
        });
        it("SCALAR", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "UnaryOpUGen", C.SCALAR, specialIndex, [ 0,0 ], [ C.SCALAR ]
          ]);
          u.inRates[0] = C.SCALAR;
          u.inputs[0]  = new Float32Array(1);
          u.init();
          
          assert.isNotFunction(u.process);
        });
        it("DEMAND", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "UnaryOpUGen", C.DEMAND, specialIndex, [ 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.DEMAND;
          u.inputs[0]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.uopFunc.uopTest.d);
        });
        it("undefined", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "UnaryOpUGen", C.CONTROL, -1, [ 0,0 ], [ C.CONTROL ]
          ]);
          assert.throws(function() {
            u.init();
          }, "UnaryOpUGen[unknown] is not defined.");
        });
      });
    });
    describe("binary operators", function() {
      describe("bopFunc", function() {
        Object.keys(basic_unit.bopFunc).forEach(function(selector) {
          var specialIndex = ops.BINARY_OPS_MAP.indexOf(selector);
          it(selector + "("+specialIndex+")", function() {
            var func = basic_unit.bopFunc[selector];
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
          basic_unit.binary_aa(func).call(that, 8);
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
          basic_unit.binary_ak(func).call(that, 8);
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
          basic_unit.binary_ai(func).call(that, 8);
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
          basic_unit.binary_ka(func).call(that, 8);
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
          basic_unit.binary_kk(func).call(that, 1);
          assert.equal(that.outputs[0][0], 11);
        });
        it("binary_ki", function() {
          basic_unit.binary_ki(func).call(that, 1);
          assert.equal(that.outputs[0][0], 11);
        });
        it("binary_ia", function() {
          basic_unit.binary_ia(func).call(that, 8);
          assert.equal(that.outputs[0][0], 11);
          assert.equal(that.outputs[0][1], 21);
          assert.equal(that.outputs[0][2], 31);
          assert.equal(that.outputs[0][3], 41);
          assert.equal(that.outputs[0][4], 51);
          assert.equal(that.outputs[0][5], 61);
          assert.equal(that.outputs[0][6], 71);
          assert.equal(that.outputs[0][7], 81);
        });
        it("binary_ik", function() {
          basic_unit.binary_ik(func).call(that, 1);
          assert.equal(that.outputs[0][0], 11);
        });
        it("binary_dd (AUDIO x DEMAND)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function() {
                that.inputs[1][0] = 100;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 8);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 108);
        });
        it("binay_dd (CONTROL x DEMAND)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = 100;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 101);
        });
        it("binay_dd (SCALAR x DEMAND)", function() {
          var passed = 0;
          that.fromUnits = [
            null, // constant value
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = 100;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 101);
        });
        it("binay_dd (DEMAND x AUDIO)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 8);
                that.inputs[0][0] = 100;
                passed += 1;
              }
            },
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 8);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 180);
        });
        it("binay_dd (DEMAND x CONTROL)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = 100;
                passed += 1;
              }
            },
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 110);
        });
        it("binay_dd (DEMAND x SCALAR)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = 100;
                passed += 1;
              }
            },
            null // constant value
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.equal(that.outputs[0][0], 110);
        });
        it("binay_dd (DEMAND x DEMAND)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = 100;
                passed += 1;
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = 100;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 2);
          assert.equal(that.outputs[0][0], 200);
        });
        it("binay_dd (AUDIO x DEMAND:NaN)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 8);
                that.inputs[1][0] = NaN;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 8);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (CONTROL x DEMAND:NaN)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = NaN;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (SCALAR x DEMAND:NaN)", function() {
          var passed = 0;
          that.fromUnits = [
            null, // constant value
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = NaN;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (DEMAND:NaN x AUDIO)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = NaN;
                passed += 1;
              }
            },
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (DEMAND:NaN x CONTROL)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = NaN;
                passed += 1;
              }
            },
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (DEMAND:NaN x SCALAR)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = NaN;
                passed += 1;
              }
            },
            null // constant value
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 1);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (DEMAND:NaN x DEMAND:NaN)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[0][0] = NaN;
                passed += 1;
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 1);
                that.inputs[1][0] = NaN;
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 1);
          assert.equal(passed, 2);
          assert.isTrue(isNaN(that.outputs[0][0]));
        });
        it("binay_dd (AUDIO x DEMAND:reset)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (CONTROL x DEMAND:reset)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (SCALAR x DEMAND:reset)", function() {
          var passed = 0;
          that.fromUnits = [
            null, // constant value
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (DEMAND:reset x AUDIO)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
            {
              calcRate: C.AUDIO,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (DEMAND:reset x CONTROL)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
            {
              calcRate: C.CONTROL,
              process : function() {
                throw "should not be called"
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (DEMAND:reset x SCALAR)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
            null // constant value
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 1);
        });
        it("binay_dd (DEMAND:reset x DEMAND:reset)", function() {
          var passed = 0;
          that.fromUnits = [
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
            {
              calcRate: C.DEMAND,
              process : function(inNumSamples) {
                assert.equal(inNumSamples, 0);
                passed += 1;
              }
            },
          ];
          actual = basic_unit.binary_dd(func).call(that, 0);
          assert.equal(passed, 2);
        });
        it("+.aa", function() {
          basic_unit.bopFunc["+"].aa.call(that, 8);
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
          basic_unit.bopFunc["+"].ak.call(that, 8);
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
          basic_unit.bopFunc["+"].ai.call(that, 8);
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
          basic_unit.bopFunc["+"].ka.call(that, 8);
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
          basic_unit.bopFunc["+"].kk.call(that, 8);
          assert.equal(that.outputs[0][0], 1 + 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("+.ki", function() {
          basic_unit.bopFunc["+"].ki.call(that, 8);
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
          basic_unit.bopFunc["+"].ia.call(that, 8);
          assert.equal(that.outputs[0][0], 1 + 10);
          assert.equal(that.outputs[0][1], 1 + 20);
          assert.equal(that.outputs[0][2], 1 + 30);
          assert.equal(that.outputs[0][3], 1 + 40);
          assert.equal(that.outputs[0][4], 1 + 50);
          assert.equal(that.outputs[0][5], 1 + 60);
          assert.equal(that.outputs[0][6], 1 + 70);
          assert.equal(that.outputs[0][7], 1 + 80);
        });
        it("+.ik", function() {
          basic_unit.bopFunc["+"].ik.call(that, 8);
          assert.equal(that.outputs[0][0], 1 + 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("-.aa", function() {
          basic_unit.bopFunc["-"].aa.call(that, 8);
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
          basic_unit.bopFunc["-"].ak.call(that, 8);
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
          basic_unit.bopFunc["-"].ai.call(that, 8);
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
          basic_unit.bopFunc["-"].ka.call(that, 8);
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
          basic_unit.bopFunc["-"].kk.call(that, 8);
          assert.equal(that.outputs[0][0], 1 - 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("-.ki", function() {
          basic_unit.bopFunc["-"].ki.call(that, 8);
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
          basic_unit.bopFunc["-"].ia.call(that, 8);
          assert.equal(that.outputs[0][0], 1 - 10);
          assert.equal(that.outputs[0][1], 1 - 20);
          assert.equal(that.outputs[0][2], 1 - 30);
          assert.equal(that.outputs[0][3], 1 - 40);
          assert.equal(that.outputs[0][4], 1 - 50);
          assert.equal(that.outputs[0][5], 1 - 60);
          assert.equal(that.outputs[0][6], 1 - 70);
          assert.equal(that.outputs[0][7], 1 - 80);
        });
        it("-.ik", function() {
          basic_unit.bopFunc["-"].ik.call(that, 8);
          assert.equal(that.outputs[0][0], 1 - 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("*.aa", function() {
          basic_unit.bopFunc["*"].aa.call(that, 8);
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
          basic_unit.bopFunc["*"].ak.call(that, 8);
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
          basic_unit.bopFunc["*"].ai.call(that, 8);
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
          basic_unit.bopFunc["*"].ka.call(that, 8);
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
          basic_unit.bopFunc["*"].kk.call(that, 8);
          assert.equal(that.outputs[0][0], 1 * 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
        it("*.ki", function() {
          basic_unit.bopFunc["*"].ki.call(that, 8);
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
          basic_unit.bopFunc["*"].ia.call(that, 8);
          assert.equal(that.outputs[0][0], 1 * 10);
          assert.equal(that.outputs[0][1], 1 * 20);
          assert.equal(that.outputs[0][2], 1 * 30);
          assert.equal(that.outputs[0][3], 1 * 40);
          assert.equal(that.outputs[0][4], 1 * 50);
          assert.equal(that.outputs[0][5], 1 * 60);
          assert.equal(that.outputs[0][6], 1 * 70);
          assert.equal(that.outputs[0][7], 1 * 80);
        });
        it("*.ik", function() {
          basic_unit.bopFunc["*"].ik.call(that, 8);
          assert.equal(that.outputs[0][0], 1 * 10);
          assert.equal(that.outputs[0][1], 0);
          assert.equal(that.outputs[0][2], 0);
          assert.equal(that.outputs[0][3], 0);
          assert.equal(that.outputs[0][4], 0);
          assert.equal(that.outputs[0][5], 0);
          assert.equal(that.outputs[0][6], 0);
          assert.equal(that.outputs[0][7], 0);
        });
      });
      describe("unit.process", function() {
        var specialIndex;
        before(function() {
          specialIndex = ops.BINARY_OPS_MAP.length;
          ops.BINARY_OPS_MAP[specialIndex] = "bopTest";
          basic_unit.bopFunc.bopTest = function(a, b) {
            return a + b + 1;
          };
          basic_unit.bopFunc.bopTest.aa = basic_unit.binary_aa(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ak = basic_unit.binary_ak(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ai = basic_unit.binary_ai(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ka = basic_unit.binary_ka(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.kk = basic_unit.binary_kk(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ki = basic_unit.binary_ki(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ia = basic_unit.binary_ia(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.ik = basic_unit.binary_ik(basic_unit.bopFunc.bopTest);
          basic_unit.bopFunc.bopTest.dd = basic_unit.binary_dd(basic_unit.bopFunc.bopTest);
        });
        it("AUDIO x AUDIO", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.AUDIO;
          u.inRates[1] = C.AUDIO;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.aa);
        });
        it("AUDIO x CONTROL", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.AUDIO;
          u.inRates[1] = C.CONTROL;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ak);
        });
        it("AUDIO x SCALAR", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, -1,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.AUDIO;
          u.inRates[1] = C.SCALAR;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ai);
        });
        it("CONTROL x AUDIO", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.CONTROL;
          u.inRates[1] = C.AUDIO;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ka);
        });
        it("CONTROL x CONTROL", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
          ]);
          u.inRates[0] = C.CONTROL;
          u.inRates[1] = C.CONTROL;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.kk);
        });
        it("CONTROL x SCALAR", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
          ]);
          u.inRates[0] = C.CONTROL;
          u.inRates[1] = C.SCALAR;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ki);
        });
        it("SCALAR x AUDIO", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, specialIndex, [ 0,0, 0,0 ], [ C.AUDIO ]
          ]);
          u.inRates[0] = C.SCALAR;
          u.inRates[1] = C.AUDIO;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ia);
        });
        it("SCALAR x CONTROL", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.CONTROL, specialIndex, [ 0,0, 0,0 ], [ C.CONTROL ]
          ]);
          u.inRates[0] = C.SCALAR;
          u.inRates[1] = C.CONTROL;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.ik);
        });
        it("SCALAR x SCALAR", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.SCALAR, specialIndex, [ 0,0, 0,0 ], [ C.SCALAR ]
          ]);
          u.inRates[0] = C.SCALAR;
          u.inRates[1] = C.SCALAR;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.isNotFunction(u.process);
        });
        it("AUDIO x DEMAND", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.AUDIO;
          u.inRates[1] = C.DEMAND;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("CONTROL x DEMAND", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.CONTROL;
          u.inRates[1] = C.DEMAND;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("SCALAR x DEMAND", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.SCALAR;
          u.inRates[1] = C.DEMAND;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("DEMAND x AUDIO", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.DEMAND;
          u.inRates[1] = C.AUDIO;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("DEMAND x CONTROL", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.DEMAND;
          u.inRates[1] = C.CONTROL;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("DEMAND x SCALAR", function() {
          var u = cc.createUnit({
            heap:new Float32Array(1), heapIndex:0
          }, [
            "BinaryOpUGen", C.DEMAND, specialIndex, [ 0,0, 0,0 ], [ C.DEMAND ]
          ]);
          u.inRates[0] = C.DEMAND;
          u.inRates[1] = C.SCALAR;
          u.inputs[0]  = new Float32Array(1);
          u.inputs[1]  = new Float32Array(1);
          u.init();
          
          assert.equal(u.process, basic_unit.bopFunc.bopTest.dd);
        });
        it("undefined", function() {
          var u = cc.createUnit({
            heap:new Float32Array(100), heapIndex:0
          }, [
            "BinaryOpUGen", C.AUDIO, -1, [ 0,0 ], [ C.AUDIO ]
          ]);
          
          assert.throws(function() {
            u.init();
          }, "BinaryOpUGen[unknown] is not defined.");
        });
      });
    });
  });

  unitTestSuite.desc = "server/unit/madd.js";

  unitTestSuite(["MulAdd"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.AUDIO , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in" , rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"mul", rate:C.SCALAR , value:0.01 },
        { name:"add", rate:C.AUDIO  , value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in" , rate:C.SCALAR, value:0.01 },
        { name:"mul", rate:C.SCALAR, value:0.01 },
        { name:"add", rate:C.SCALAR, value:0.01 },
      ]
    },
  ]);

  unitTestSuite(["Sum3"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR , value:0.01 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in0", rate:C.SCALAR, value:0.01 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
      ]
    },
  ]);

  unitTestSuite(["Sum4"], [
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO, value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO, value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO, value:unitTestSuite.in2 },
        { name:"in3", rate:C.AUDIO, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO  , value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.AUDIO , value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO  , value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.AUDIO , value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in0 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO  , value:unitTestSuite.in0 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in2", rate:C.SCALAR , value:0.01 },
        { name:"in3", rate:C.SCALAR , value:0.01 },
      ]
    },
    { rate  : C.AUDIO,
      inputs: [
        { name:"in0", rate:C.AUDIO , value:unitTestSuite.in0 },
        { name:"in1", rate:C.SCALAR, value:0.01 },
        { name:"in2", rate:C.SCALAR, value:0.01 },
        { name:"in3", rate:C.SCALAR, value:0.01 },
      ]
    },
    { rate  : C.CONTROL,
      inputs: [
        { name:"in0", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in1", rate:C.CONTROL, value:unitTestSuite.in2 },
        { name:"in2", rate:C.CONTROL, value:unitTestSuite.in1 },
        { name:"in3", rate:C.CONTROL, value:unitTestSuite.in2 },
      ]
    },
    { rate  : C.SCALAR,
      inputs: [
        { name:"in0", rate:C.SCALAR, value:1 },
        { name:"in1", rate:C.SCALAR, value:2 },
        { name:"in2", rate:C.SCALAR, value:3 },
        { name:"in3", rate:C.SCALAR, value:4 },
      ]
    },
  ]);
  
  module.exports = {};

});
