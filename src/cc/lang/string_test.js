define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./string");

  var testTools = require("../../testTools");
  var cc  = require("./cc");
  var ops = require("../common/ops");
  
  describe("lang/string.js", function() {
    var actual, expected;
    testTools.mock("instanceOfUGen", function() {
      return false;
    });
    
    describe("class methods", function() {
    });
    
    describe("instance methods", function() {
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction("s"[selector], selector);
        });
      });
      describe("common methods", function() {
        it("copy", function() {
          assert.equal("s".copy(), "s");
        });
        it("clone", function() {
          assert.equal("s".clone(), "s");
        });
        it("dup", function() {
          actual   = "s".dup();
          expected = [ "s", "s" ];
          assert.deepEqual(actual, expected);
          
          actual   = "s".dup(5);
          expected = [ "s", "s", "s", "s", "s" ];
          assert.deepEqual(actual, expected);
        });
        it("value", function() {
          actual   = "s".value();
          expected = "s";
          assert.equal(actual, expected);
        });
        it("valueArray", function() {
          actual   = "s".valueArray();
          expected = "s";
          assert.equal(actual, expected);
        });
        it("asUGenInput", function() {
          assert.throw(function() {
            "s".asUGenInput();
          });
        });
        it("asString", function() {
          actual   = "a".asString();
          expected = "a";
          assert.equal(actual, expected);
        });
      });
      describe("unary operators", function() {
        it("common", function() {
          ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function() {
              return this;
            }, function() {
              assert.equal("10"[selector](), 10);
              assert.equal("xx"[selector](),  0);
            });
          });
        });
      });
      describe("binary operators", function() {
        it("common", function() {
          ["__sub__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this, b ];
            }, function() {
              assert.deepEqual("10"[selector](1), [ 10, 1 ]);
              assert.deepEqual("xx"[selector](1), [  0, 1 ]);
            });
          });
        });
        it("__add__", function() {
          assert.equal("+10".__add__(1), "+101");
        });
        it("__mul__", function() {
          assert.equal("+10".__mul__(0), "");
          assert.equal("+10".__mul__(2), "+10+10");
          assert.equal("str".__mul__("str"), 0);
          assert.throw(function() {
            assert.equal("+10".__mul__(Infinity), "");
          }, RangeError);
        });
        it("__div__", function() {
          assert.deepEqual("+10".__div__(0), ["+10"]);
          assert.deepEqual("+10".__div__(1), ["+10"]);
          assert.deepEqual("+10".__div__(2), ["+1", "0"]);
          assert.deepEqual("+10".__div__(3), ["+", "1", "0"]);
          assert.deepEqual("+10".__div__(4), ["+", "1", "0"]);
          assert.deepEqual("+10".__div__(""), 0);
        });
        it("__mod__", function() {
          assert.deepEqual("+10".__mod__(0), ["+", "1", "0"]);
          assert.deepEqual("+10".__mod__(1), ["+", "1", "0"]);
          assert.deepEqual("+10".__mod__(2), ["+1", "0"]);
          assert.deepEqual("+10".__mod__(3), ["+10"]);
          assert.deepEqual("+10".__mod__(4), ["+10"]);
          assert.deepEqual("+10".__mod__(""), 0);
        });
      });
      describe("arity operators", function() {
        it("common", function() {
          Object.keys(ops.ARITY_OPS).forEach(function(selector) {
            var args = ops.ARITY_OPS[selector].split(",").map(function(_, i) { return i; });
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this ].concat(args);
            }, function() {
              assert.deepEqual("10"[selector].apply("10", args), [10].concat(args));
              assert.deepEqual("xx"[selector].apply("xx", args), [ 0].concat(args));
            });
          });
        });
      });
    });
  });

});
