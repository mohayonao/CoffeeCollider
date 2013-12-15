define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./date");

  var testTools = require("../../testTools");
  var cc  = require("./cc");
  var ops = require("../common/ops");
  
  describe("lang/date.js", function() {
    var d = new Date(0), n = +d;
    var actual, expected;
    
    testTools.mock("instanceOfUGen", function() {
      return false;
    });
    
    describe("class methods", function() {
    });
    
    describe("instance methods", function() {
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction(d[selector], selector);
        });
      });
      describe("common methods", function() {
        it("copy", function() {
          assert.deepEqual(d.copy(), d);
          assert.notEqual(d.copy(), d);
        });
        it("clone", function() {
          assert.deepEqual(d.clone(), d);
          assert.notEqual(d.clone(), d);
        });
        it("dup", function() {
          actual   = d.dup();
          expected = [ d, d ];
          assert.deepEqual(actual, expected);

          actual   = d.dup(5);
          expected = [ d, d, d, d, d ];
          assert.deepEqual(actual, expected);
        });
        it("asUGenInput", function() {
          assert.throws(function() {
            d.asUGenInput();
          });
        });
        it("asString", function() {
          actual   = d.asString();
          expected = d.toString();
          assert.equal(actual, expected);
        });
      });
      describe("unary operators", function() {
        it("common", function() {
          ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
            testTools.replaceTempNumberPrototype(selector, function() {
              return this;
            }, function() {
              assert.equal(d[selector](), n);
              assert.equal(d[selector](), n);
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
              assert.deepEqual(d[selector](1), [ n, 1 ]);
              assert.deepEqual(d[selector](1), [ n, 1 ]);
            });
          });
        });
      });
      describe("arity operators", function() {
        it("common", function() {
          Object.keys(ops.ARITY_OPS).forEach(function(selector) {
            var args = ops.ARITY_OPS[selector].split(",").map(function(_, i) { return i; });
            testTools.replaceTempNumberPrototype(selector, function(b) {
              return [ this ].concat(args);
            }, function() {
              assert.deepEqual(d[selector].apply(d, args), [n].concat(args), selector);
              assert.deepEqual(d[selector].apply(d, args), [n].concat(args), selector);
            });
          });
        });
      });
    });
  });

});
