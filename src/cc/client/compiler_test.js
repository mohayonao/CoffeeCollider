define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Compiler = require("./compiler").Compiler;

  describe("Compiler#", function() {
    var compiler, _ = {};
    before(function() {
      compiler = new Compiler();
    });
    describe("doPI:", function() {
      it("pi => Math.PI", function() {
        var tokens = [
          [ "IDENTIFIER", "pi", _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPI(tokens);
        assert.deepEqual(actual, expected);
      });
      it("10pi => 10 * Math.PI", function() {
        var tokens = [
          [ "NUMBER"    , 10  , _ ],
          [ "IDENTIFIER", "pi", _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "NUMBER"    , 10    , _ ],
          [ "MATH"      , "*"   , _ ],
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var actual = compiler.doPI(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("doPrecedence:", function() {
      it("a * b + c => (a * b) + c", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a + b * c => a + (b * c)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a * [b, c] => (a * [b, c])", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "["         , "[" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "]"         , "]" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "["         , "[" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "]"         , "]" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("[a, b] * c => ([a, b] * c)", function() {
        var tokens = [
          [ "["         , "[" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "]"         , "]" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "["         , "[" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "]"         , "]" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a * (b + c) => ((a * (b + c))", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("(a + b) * c => ((a + b) * c)", function() {
        var tokens = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a * f(b, c) => (a * f(b, c))", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "f" , _ ],
          [ "CALL_START", "(" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "CALL_END"  , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "f" , _ ],
          [ "CALL_START", "(" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "CALL_END"  , ")" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("f(a, b) * c => (f(a, b) * c)", function() {
        var tokens = [
          [ "IDENTIFIER", "f" , _ ],
          [ "CALL_START", "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "CALL_END"  , ")" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "f" , _ ],
          [ "CALL_START", "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ ","         , "," , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "CALL_END"  , ")" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a.a * b.b + c.c => (a.a * b.b) + c.c", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a * b * c => ((a * b) * c)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.doPrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("doBOP:", function() {
      it("a + b => a.__add__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__add__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a - b => a.__sub__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "-"         , "-" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__sub__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a * b => a.__mul__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "*" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__mul__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a / b => a.__div__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "/" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__div__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a % b => a.__mod__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "MATH"      , "%" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__mod__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a + [1, 2] => a.__add__([1, 2])", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "["         , "[" , _ ],
          [ "NUMBER"    , "1" , _ ],
          [ ","         , "," , _ ],
          [ "NUMBER"    , "2" , _ ],
          [ "]"         , "]" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__add__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "["         , "["       , _ ],
          [ "NUMBER"    , "1"       , _ ],
          [ ","         , ","       , _ ],
          [ "NUMBER"    , "2"       , _ ],
          [ "]"         , "]"       , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
      it("a + b.c => a.__add__(b.c)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"       , _ ],
          [ "."         , "."       , _ ],
          [ "IDENTIFIER", "__add__" , _ ],
          [ "CALL_START", "("       , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "."         , "." , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ "CALL_END"  , ")"       , _ ],
          [ "TERMINATOR", "\n"      , _ ],
        ];
        var actual = compiler.doBOP(tokens);
        assert.deepEqual(actual, expected);
      });
    });
  });

});
