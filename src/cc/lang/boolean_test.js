define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  require("./boolean");

  var testTools = require("../../testTools");
  var cc  = require("./cc");
  var ops = require("../common/ops");
  
  describe("lang/boolean.js", function() {
    var actual, expected;
    var _instanceOfUGen, _createTaskWaitLogic;
    before(function() {
      _instanceOfUGen = cc.instanceOfUGen;
      _createTaskWaitLogic = cc.createTaskWaitLogic;

      cc.instanceOfUGen = function() {
        return false;
      };
      cc.createTaskWaitLogic = function(logic, list) {
        return [logic].concat(list);
      };
    });
    after(function() {
      cc.instanceOfUGen = _instanceOfUGen;
      cc.createTaskWaitLogic = _createTaskWaitLogic;
    });

    describe("class methods", function() {
    });
    
    describe("instance methods", function() {
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction(true[selector], selector);
        });
      });
      describe("common", function() {
        it("copy", function() {
          assert.equal(true .copy(), true );
          assert.equal(false.copy(), false);
        });
        it("dup", function() {
          actual   = true.dup();
          expected = [ true, true ];
          assert.deepEqual(actual, expected);

          actual   = false.dup(5);
          expected = [ false, false, false, false, false ];
          assert.deepEqual(actual, expected);
        });
      });
      describe("unary operators", function() {
        it("common", function() {
          ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function() {
              return this;
            }, function() {
              assert.equal(true [selector](), 1);
              assert.equal(false[selector](), 0);
            });
          });
        });
      });
      describe("binary operators", function() {
        it("common", function() {
          ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this, b ];
            }, function() {
              assert.deepEqual(true [selector](1), [ 1, 1 ]);
              assert.deepEqual(false[selector](1), [ 0, 1 ]);
            });
          });
        });
        it("__and__", function() {
          assert.deepEqual(true.__and__(false), ["and", true, false]);
        });
        it("__or__", function() {
          assert.deepEqual(false.__or__(true), ["or", false, true]);
        });
      });
      describe("arity operators", function() {
        it("common", function() {
          Object.keys(ops.ARITY_OPS).forEach(function(selector) {
            var args = ops.ARITY_OPS[selector].split(",").map(function(_, i) { return i; });
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this ].concat(args);
            }, function() {
              assert.deepEqual(true [selector].apply(true , args), [1].concat(args));
              assert.deepEqual(false[selector].apply(false, args), [0].concat(args));
            });
          });
        });
      });
    });
  });

});
