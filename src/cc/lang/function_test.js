define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  require("./function");

  var testTools = require("../../testTools");
  var cc  = require("./cc");
  var ops = require("../common/ops");
  
  var f_n = function() { return NaN; };
  var f_1 = function() { return 1; };
  
  describe("lang/function.js", function() {
    var actual, expected;
    var _instanceOfUGen;
    before(function() {
      _instanceOfUGen = cc.instanceOfUGen;
      
      cc.instanceOfUGen = function() {
        return false;
      };
    });
    after(function() {
      cc.instanceOfUGen = _instanceOfUGen;
    });
    
    describe("class methods", function() {
    });

    describe("instance methods", function() {
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction(f_1[selector], selector);
        });
      });
      describe("common methods", function() {
        it("copy", function() {
          assert.equal(f_1.copy(), f_1);
        });
        it("clone", function() {
          assert.equal(f_1.clone(), f_1);
        });
        it("dup", function() {
          actual   = f_1.dup();
          expected = [ 1, 1 ];
          assert.deepEqual(actual, expected);

          actual   = f_1.dup(5);
          expected = [ 1, 1, 1, 1, 1 ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("unary operators", function() {
        it("common", function() {
          ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function() {
              return this;
            }, function() {
              assert.equal(f_n[selector](), 0);
              assert.equal(f_1[selector](), 1);
            });
          });
        });
      });
      describe("binary operators", function() {
        it("common", function() {
          ["__sub__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this, b ];
            }, function() {
              assert.deepEqual(f_n[selector](1), [ 0, 1 ]);
              assert.deepEqual(f_1[selector](1), [ 1, 1 ]);
            });
          });
        });
        it("__add__", function() {
          assert.equal(f_n.__add__(f_1), f_n.toString() + f_1.toString());
        });
        it("__mul__", function() {
          assert.equal(f_n.__mul__(0), 0);
          var func2 = function(x) {
            return x * 100;
          }.__mul__(function(x) {
            return x + 1;
          });
          assert.equal(func2(0), 100);
        });
      });
      describe("arity operators", function() {
        it("common", function() {
          Object.keys(ops.ARITY_OPS).forEach(function(selector) {
            var args = ops.ARITY_OPS[selector].split(",").map(function(_, i) { return i; });
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this ].concat(args);
            }, function() {
              assert.deepEqual(f_n[selector].apply(f_n, args), [0].concat(args), selector);
              assert.deepEqual(f_1[selector].apply(f_1, args), [1].concat(args), selector);
            });
          });
        });
      });
    });
    
    describe("global methods", function() {
      var _ = {};
      it("unary operators", function() {
        Object.keys(ops.UNARY_OPS).forEach(function(selector) {
          if (!/^[a-z]/.test(selector)) {
            return;
          }
          testTools.replaceTempNumberPrototype(selector, function() {
            return this;
          }, function() {
            assert.equal(cc.global[selector](100), 100);
            assert.equal(cc.global[selector](_), _);
          });
        });
      });
      it("binary operators", function() {
        Object.keys(ops.BINARY_OPS).forEach(function(selector) {
          if (!/^[a-z]/.test(selector)) {
            return;
          }
          testTools.replaceTempNumberPrototype(selector, function(b) {
            return [ this, b ];
          }, function() {
            assert.deepEqual(cc.global[selector](100, 200), [ 100, 200 ]);
            assert.equal(cc.global[selector](_), _);
          });
        });
      });
      it("arity operators", function() {
        Object.keys(ops.ARITY_OPS).forEach(function(selector) {
          var args = ops.ARITY_OPS[selector].split(",").map(function(_, i) { return i; });
          testTools.replaceTempNumberPrototype(selector, function(b) {
            return args.slice();
          }, function() {
            assert.deepEqual(cc.global[selector].apply(null, args), args);
            assert.equal(cc.global[selector](_), _);
          });
        });
      });
    });
  });

});
