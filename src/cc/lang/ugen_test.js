define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc   = require("./cc");
  var ops  = require("../common/ops");
  var ugen = require("./ugen");
  var UGen = ugen.UGen;
  
  describe("lang/ugen/ugen.js", function() {
    var actual, expected;
    var _createMulAdd, _createUnaryOpUGen, _createBinaryOpUGen;
    before(function() {
      _createMulAdd = cc.createMulAdd;
      _createUnaryOpUGen = cc.createUnaryOpUGen;
      _createBinaryOpUGen = cc.createBinaryOpUGen;
      
      cc.createMulAdd = function(ugen, a, b) {
        return ugen.inputs[0] * a + b;
      };
      cc.createUnaryOpUGen = function(selector, a) {
        return [ selector, a ];
      };
      cc.createBinaryOpUGen = function(selector, a, b) {
        return [ selector, a, b ];
      };
      
      cc.ugen.register("Test", {
        $ar: {
          defaults: "val1=1,val2=2",
          ctor: function(val1, val2) {
            return this.multiNew(C.AUDIO, val1, val2);
          }
        },
        $kr: {
          defaults: "val1=1,val2=2",
          ctor: function(val1, val2) {
            return this.multiNew(C.CONTROL, val1, val2);
          }
        },
      });
    });
    after(function() {
      cc.createMulAdd = _createMulAdd;
      cc.createUnaryOpUGen  = _createUnaryOpUGen;
      cc.createBinaryOpUGen = _createBinaryOpUGen;
    });
    
    describe("instance", function() {
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
        var instance = cc.global.Test.ar(10);
        assert.equal(2, instance.numOfInputs);
        assert.deepEqual([10, 2], instance.inputs);
      });
    });
    
    describe("class methods", function() {
    });
    
    describe("instance methods", function() {
      var instance;
      beforeEach(function() {
        instance = cc.global.Test.ar();
      });      
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction(instance[selector], selector);
        });
      });
      describe("common methods", function() {
        it("copy", function() {
          assert.equal(instance.copy(), instance);
        });
        it("dup", function() {
          assert.deepEqual(instance.dup(), [ instance, instance ]);
          assert.deepEqual(instance.dup(5), [ instance, instance, instance, instance, instance ]);
        });
      });
      describe("unary operators", function() {
        it("common", function() {
          ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
            if (/^[_a-z]/.test(selector)) {
              var ugenSelector;
              if (ops.ALIASES.hasOwnProperty(selector)) {
                ugenSelector = ops.ALIASES[selector];
              } else {
                ugenSelector = selector;
              }
              actual = instance[selector]();
              assert.deepEqual(actual, [ugenSelector, instance], selector);
            }
          });
        });
      });
      describe("binary operators", function() {
        before(function() {
          testTools.useFourArithmeticOperations();
        });
        after(function() {
          testTools.unuseFourArithmeticOperations();
        });
        it("common", function() {
          ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
            if (/^[_a-z]/.test(selector)) {
              var ugenSelector;
              if (ops.ALIASES.hasOwnProperty(selector)) {
                ugenSelector = ops.ALIASES[selector];
              } else {
                ugenSelector = selector;
              }
              actual = instance[selector](10);
              assert.deepEqual(actual, [ugenSelector, instance, 10], selector);
            }
          });
        });
        it("__and__", function() {
          assert.equal(instance.__and__(1), 0);
        });
        it("__or__", function() {
          assert.equal(instance.__or__(1), 0);
        });
        describe("arity operators", function() {
          it("madd", function() {
            var instance = cc.global.Test.ar(10);
            actual = instance.madd(100, 50);
            assert.equal(actual, 10 * 100 + 50);
          });
          it("range", function() {
            var instance = cc.global.Test.ar(0.75);
            actual = instance.range(-100, 100);
            assert.equal(actual, 75);

            instance.signalRange = C.UNIPOLAR;
            actual = instance.range(-100, 100);
            assert.equal(actual, 50);
          });
          it.skip("exprange", function() {
          });
          it.skip("curverange", function() {
          });
          it("unipolar", function() {
            var instance = cc.global.Test.ar(0.5);
            instance.signalRange = C.UNIPOLAR;
            actual = instance.unipolar(10);
            assert.equal(actual, 5);
            
            instance.signalRange = C.BIPOLAR;
            actual = instance.unipolar(10);
            assert.equal(actual, 7.5);
          });
          it("bipolar", function() {
            testTools.replaceTempNumberPrototype("neg", function() {
              return -this;
            }, function() {
              var instance = cc.global.Test.ar(0.5);
              instance.signalRange = C.UNIPOLAR;
              actual = instance.bipolar(10);
              assert.equal(actual, 0);

              instance.signalRange = C.BIPOLAR;
              actual = instance.bipolar(10);
              assert.equal(actual, 5);
            });
          });
          it("clip", function() {
            var _Clip = cc.global.Clip;
            cc.global.Clip = function(rate, input, lo, hi) {
              return [ "Clip", rate, input, lo, hi ];
            };
            
            actual   = instance.clip(1, 2);
            expected = [ "Clip", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Clip = _Clip;
          });
          it("fold", function() {
            var _Fold = cc.global.Fold;
            cc.global.Fold = function(rate, input, lo, hi) {
              return [ "Fold", rate, input, lo, hi ];
            };
            
            actual   = instance.fold(1, 2);
            expected = [ "Fold", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Fold = _Fold;
          });
          it("wrap", function() {
            var _Wrap = cc.global.Wrap;
            cc.global.Wrap = function(rate, input, lo, hi) {
              return [ "Wrap", rate, input, lo, hi ];
            };
            
            actual   = instance.wrap(1, 2);
            expected = [ "Wrap", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Wrap = _Wrap;
          });
          it("blend", function() {
            var u1 = cc.global.Test.ar();
            var u2 = cc.global.Test.kr();
            var u3 = cc.global.Test.kr();
            var _XFade2 = cc.global.XFade2;
            var _LinXFade2 = cc.global.LinXFade2;
            cc.global.XFade2 = function(rate, inA, inB, pan) {
              return [ "XFade2", rate, inA, inB, pan ];
            };
            cc.global.LinXFade2 = function(rate, inA, inB, pan) {
              return [ "LinXFade2", rate, inA, inB, pan ];
            };
            testTools.replaceTempNumberPrototype("linlin", function() {
              return 0.5;
            }, function() {
              actual   = u1.blend(u2, 0.1);
              expected = [ "XFade2", C.AUDIO, u1, u2, 0.5 ];
              assert.deepEqual(actual, expected);
              
              testTools.replaceTempNumberPrototype("neg", function() {
                return -this;
              }, function() {
                actual   = u2.blend(u1, 0.1);
                expected = [ "XFade2", C.AUDIO, u1, u2, -0.5 ];
                assert.deepEqual(actual, expected);
              });
              
              actual   = u2.blend(u3, 0.1);
              expected = [ "LinXFade2", C.CONTROL, u2, u3, 0.5 ];
              assert.deepEqual(actual, expected);
            });
            cc.global.XFade2 = _XFade2;
            cc.global.LinXFade2 = _LinXFade2;
          });
          it("lag", function() {
            var _Lag = cc.global.Lag;
            var _LagUD = cc.global.LagUD;
            cc.global.Lag = function(rate, _in, t1) {
              return [ "Lag", rate, _in, t1 ];
            };
            cc.global.LagUD = function(rate, _in, t1, t2) {
              return [ "LagUD", rate, _in, t1, t2 ];
            };
            
            actual   = instance.lag(1);
            expected = [ "Lag", C.AUDIO, instance, 1 ]
            assert.deepEqual(actual, expected);
            
            actual   = instance.lag(1, 2);
            expected = [ "LagUD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Lag = _Lag;
            cc.global.LagUD = _LagUD;
          });
          it("lag2", function() {
            var _Lag2 = cc.global.Lag2;
            var _Lag2UD = cc.global.Lag2UD;
            cc.global.Lag2 = function(rate, _in, t1) {
              return [ "Lag2", rate, _in, t1 ];
            };
            cc.global.Lag2UD = function(rate, _in, t1, t2) {
              return [ "Lag2UD", rate, _in, t1, t2 ];
            };

            actual   = instance.lag2(1);
            expected = [ "Lag2", C.AUDIO, instance, 1 ];
            assert.deepEqual(actual, expected);
            
            actual   = instance.lag2(1, 2);
            expected = [ "Lag2UD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Lag2 = _Lag2;
            cc.global.Lag2UD = _Lag2UD;
          });
          it("lag3", function() {
            var _Lag3 = cc.global.Lag3;
            var _Lag3UD = cc.global.Lag3UD;
            cc.global.Lag3 = function(rate, _in, t1) {
              return [ "Lag3", rate, _in, t1 ];
            };
            cc.global.Lag3UD = function(rate, _in, t1, t2) {
              return [ "Lag3UD", rate, _in, t1, t2 ];
            };

            actual   = instance.lag3(1);
            expected = [ "Lag3", C.AUDIO, instance, 1 ];
            assert.deepEqual(actual, expected);
            
            actual   = instance.lag3(1, 2);
            expected = [ "Lag3UD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Lag3 = _Lag3;
            cc.global.Lag3UD = _Lag3UD;
          });
          it("lagud", function() {
            var _LagUD = cc.global.LagUD;
            cc.global.LagUD = function(rate, _in, t1, t2) {
              return [ "LagUD", rate, _in, t1, t2 ];
            };

            actual   = instance.lagud(1, 2);
            expected = [ "LagUD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.LagUD = _LagUD;
          });
          it("lag2ud", function() {
            var _Lag2UD = cc.global.Lag2UD;
            cc.global.Lag2UD = function(rate, _in, t1, t2) {
              return [ "Lag2UD", rate, _in, t1, t2 ];
            };

            actual   = instance.lag2ud(1, 2);
            expected = [ "Lag2UD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Lag2UD = _Lag2UD;
          });
          it("lag3ud", function() {
            var _Lag3UD = cc.global.Lag3UD;
            cc.global.Lag3UD = function(rate, _in, t1, t2) {
              return [ "Lag3UD", rate, _in, t1, t2 ];
            };

            actual   = instance.lag3ud(1, 2);
            expected = [ "Lag3UD", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Lag3UD = _Lag3UD;
          });
          it("varlag", function() {
            var _VarLag = cc.global.VarLag;
            cc.global.VarLag = function(rate, _in, time, curverange, warp, start) {
              return [ "VarLag", rate, _in, time, curverange, warp, start ];
            };
            
            actual   = instance.varlag(1, 2, 3, 4);
            expected = [ "VarLag", C.AUDIO, instance, 1, 2, 3, 4 ];
            assert.deepEqual(actual, expected);
            
            cc.global.VarLag = _VarLag;
          });
          it("slew", function() {
            var _Slew = cc.global.Slew;
            cc.global.Slew = function(rate, _in, up, down) {
              return [ "Slew", rate, _in, up, down ];
            };
            
            actual   = instance.slew(1, 2);
            expected = [ "Slew", C.AUDIO, instance, 1, 2 ];
            assert.deepEqual(actual, expected);
            
            cc.global.Slew = _Slew;
          });
          it.skip("prune", function() {
          });
          it("linlin", function() {
            var _LinLin = cc.global.LinLin;
            cc.global.LinLin = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "LinLin", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.linlin(0, 1, 2, 3, "none");
            expected = [ "LinLin", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.LinLin = _LinLin;
          });
          it("linexp", function() {
            var _LinExp = cc.global.LinExp;
            cc.global.LinExp = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "LinExp", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.linexp(0, 1, 2, 3, "none");
            expected = [ "LinExp", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.LinExp = _LinExp;
          });
          it("explin", function() {
            var _ExpLin = cc.global.ExpLin;
            cc.global.ExpLin = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "ExpLin", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.explin(0, 1, 2, 3, "none");
            expected = [ "ExpLin", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.ExpLin = _ExpLin;
          });
          it("expexp", function() {
            var _ExpExp = cc.global.ExpExp;
            cc.global.ExpExp = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "ExpExp", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.expexp(0, 1, 2, 3, "none");
            expected = [ "ExpExp", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.ExpExp = _ExpExp;
          });
          it("lincurve", function() {
            var _LinLin = cc.global.LinLin;
            cc.global.LinLin = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "LinLin", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.lincurve(0, 1, 2, 3, 0.2, "none");
            expected = [ "LinLin", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.LinLin = _LinLin;
          });
          it("curvelin", function() {
            var _LinLin = cc.global.LinLin;
            cc.global.LinLin = function(rate, _in, inMin, inMax, outMin, outMax) {
              return [ "LinLin", rate, _in, inMin, inMax, outMin, outMax ];
            };

            actual   = instance.curvelin(0, 1, 2, 3, 0.2, "none");
            expected = [ "LinLin", C.AUDIO, instance, 0, 1, 2, 3 ];
            assert.deepEqual(actual, expected);
            
            cc.global.LinLin = _LinLin;
          });
          it.skip("bilin", function() {
          });
        });
      });
    });
  });

});
