define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var compiler = require("./compiler");

  describe("compiler.", function() {
    var _ = {};
    describe("splitCodeAndData", function() {
      it("case 1", function() {
        var code = [
          "this is code"
        ].join("\n");
        var expected = [
          "this is code",
          ""
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
      it("case 2", function() {
        var code = [
          "this is code",
          "__END__"
        ].join("\n");
        var expected = [
          "this is code",
          ""
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
      it("case 3", function() {
        var code = [
          "this is code",
          "this is too",
          "__END__",
          "this is data",
          "this is too",
        ].join("\n");
        var expected = [
          "this is code\nthis is too",
          "this is data\nthis is too"
        ];
        var actual = compiler.splitCodeAndData(code);
        assert.deepEqual(actual, expected);
      });
    });
    describe("findOperandHead:", function() {
      it("with an unaryOperator", function() {
        var tokens = [
          [ "("         , "("   , _ ],
          [ "+"         , "+"   , _ ], // <-- head
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ "MATH"      , "*"   , _ ], // <-- from
          [ "NUMBER"    , 10    , _ ],
          [ ")"         , ")"   , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 5);
        assert.equal(actual, expected);
      });
      it("with an assign ", function() {
        var tokens = [
          [ "("         , "("   , _ ],
          [ "IDENTIFIER", "a"   , _ ],
          [ "="         , "="   , _ ],
          [ "IDENTIFIER", "Math", _ ], // <-- head
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "sin" , _ ],
          [ "CALL_START" , "("  , _ ],
          [ "NUMBER"    , 10    , _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "MATH"      , "*"   , _ ], // <-- from
          [ "NUMBER"    , 10    , _ ],
          [ ")"         , ")"   , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 3;
        var actual = compiler.findOperandHead(tokens, 9);
        assert.equal(actual, expected);
      });
      it("with a parenthesis", function() {
        var tokens = [
          [ "["         , "["   , _ ],
          [ "("         , "("   , _ ], // <-- head
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ ")"         , ")"   , _ ],
          [ "MATH"      , "*"   , _ ], // <-- from
          [ "NUMBER"    , 10    , _ ],
          [ "]"         , "]"   , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 1;
        var actual = compiler.findOperandHead(tokens, 6);
        assert.equal(actual, expected);
      });
      it("with a function", function() {
        var tokens = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ],
          [ "PARAM_START", "("  , _ ], // <-- head
          [ "IDENTIFIER" , "x"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "100", _ ],
          [ "PARAM_END"  , ")"  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ],
          [ ","          , ","  , _ ], // <-- from
          [ "NUMBER"     , "300", _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var expected = 2;
        var actual = compiler.findOperandHead(tokens, 13);
        assert.equal(actual, expected);
      });
    });
    describe("findOperandTail:", function() {
      it("", function() {
        var tokens = [
          [ "NUMBER"    , 10    , _ ],
          [ "MATH"      , "*"   , _ ], // <-- from
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ], // <-- tail
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 4;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("with a parenthesis", function() {
        var tokens = [
          [ "NUMBER"    , 10    , _ ],
          [ "MATH"      , "*"   , _ ], // <-- from
          [ "("         , "("   , _ ],
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ "MATH"      , "*"   , _ ],
          [ "NUMBER"    , 10    , _ ],
          [ ")"         , ")"   , _ ], // <-- tail
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 8;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("with a function calling", function() {
        var tokens = [
          [ "("         , "("   , _ ],
          [ "UNARY"     , "~"   , _ ], // <-- from
          [ "["         , "["   , _ ],
          [ "]"         , "]"   , _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "func", _ ],
          [ "CALL_START", "("   , _ ],
          [ "CALL_END"  , ")"   , _ ], // <-- tail
          [ ")"         , ")"   , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var expected = 7;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
      it("with a function", function() {
        var tokens = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ], // <-- from
          [ "PARAM_START", "("  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "100", _ ],
          [ "PARAM_END"  , ")"  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ], // <-- tail
          [ ","          , ","  , _ ],
          [ "NUMBER"     , "300", _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var expected = 12;
        var actual = compiler.findOperandTail(tokens, 1);
        assert.equal(actual, expected);
      });
    });
    describe("replaceSynthDef:", function() {
      it("none args", function() {
        var tokens = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var expected = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ],
          [ ","          , ","  , _ ],
          [ "STRING"     , '""' , _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var actual = compiler.replaceSynthDef(tokens);
        assert.deepEqual(actual, expected);
      });
      it("x=100, y=200", function() {
        var tokens = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ],
          [ "PARAM_START", "("  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "100", _ ],
          [ ","          , ","  , _ ],
          [ "IDENTIFIER" , "y"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "200", _ ],
          [ "PARAM_END"  , ")"  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var expected = [
          [ "IDENTIFIER" , "def"          , _ ],
          [ "CALL_START" , "("            , _ ],
          [ "PARAM_START", "("            , _ ],
          [ "IDENTIFIER" , "x"            , _ ],
          [ "="          , "="            , _ ],
          [ "NUMBER"     , "100"          , _ ],
          [ ","          , ","            , _ ],
          [ "IDENTIFIER" , "y"            , _ ],
          [ "="          , "="            , _ ],
          [ "NUMBER"     , "200"          , _ ],
          [ "PARAM_END"  , ")"            , _ ],
          [ "->"         , "->"           , _ ],
          [ "INDENT"     , "2"            , _ ],
          [ "IDENTIFIER" , "x"            , _ ],
          [ "OUTDENT"    , "2"            , _ ],
          [ ","          , ","            , _ ],
          [ "STRING"     , '"x=100,y=200"', _ ],
          [ "CALL_END"   , ")"            , _ ],
          [ "TERMINATOR" , "\n"           , _ ],      
        ];
        var actual = compiler.replaceSynthDef(tokens);
        assert.deepEqual(actual, expected);
      });
      it("with other args", function() {
        var tokens = [
          [ "IDENTIFIER" , "def", _ ],
          [ "CALL_START" , "("  , _ ],
          [ "("          , "("  , _ ],
          [ "PARAM_START", "("  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "100", _ ],
          [ ","          , ","  , _ ],
          [ "IDENTIFIER" , "y"  , _ ],
          [ "="          , "="  , _ ],
          [ "NUMBER"     , "200", _ ],
          [ "PARAM_END"  , ")"  , _ ],
          [ "->"         , "->" , _ ],
          [ "INDENT"     , "2"  , _ ],
          [ "IDENTIFIER" , "x"  , _ ],
          [ "OUTDENT"    , "2"  , _ ],
          [ ")"          , ")"  , _ ],
          [ ","          , ","  , _ ],
          [ "NUMBER"     , "300", _ ],
          [ "CALL_END"   , ")"  , _ ],
          [ "TERMINATOR" , "\n" , _ ],      
        ];
        var expected = [
          [ "IDENTIFIER" , "def"          , _ ],
          [ "CALL_START" , "("            , _ ],
          [ "("          , "("            , _ ],
          [ "PARAM_START", "("            , _ ],
          [ "IDENTIFIER" , "x"            , _ ],
          [ "="          , "="            , _ ],
          [ "NUMBER"     , "100"          , _ ],
          [ ","          , ","            , _ ],
          [ "IDENTIFIER" , "y"            , _ ],
          [ "="          , "="            , _ ],
          [ "NUMBER"     , "200"          , _ ],
          [ "PARAM_END"  , ")"            , _ ],
          [ "->"         , "->"           , _ ],
          [ "INDENT"     , "2"            , _ ],
          [ "IDENTIFIER" , "x"            , _ ],
          [ "OUTDENT"    , "2"            , _ ],
          [ ")"          , ")"            , _ ],
          [ ","          , ","            , _ ],
          [ "STRING"     , '"x=100,y=200"', _ ],
          [ ","          , ","            , _ ],
          [ "NUMBER"     , "300"          , _ ],
          [ "CALL_END"   , ")"            , _ ],
          [ "TERMINATOR" , "\n"           , _ ],      
        ];
        var actual = compiler.replaceSynthDef(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("replacePi:", function() {
      it("pi => Math.PI", function() {
        var tokens = [
          [ "IDENTIFIER", "pi", _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var actual = compiler.replacePi(tokens);
        assert.deepEqual(actual, expected);
      });
      it("-10pi => (-10 * Math.PI)", function() {
        var tokens = [
          [ "-"         , "-" , _ ],
          [ "NUMBER"    , 10  , _ ],
          [ "IDENTIFIER", "pi", _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "("   , _ ],
          [ "-"         , "-"   , _ ],
          [ "NUMBER"    , 10    , _ ],
          [ "MATH"      , "*"   , _ ],
          [ "IDENTIFIER", "Math", _ ],
          [ "."         , "."   , _ ],
          [ "IDENTIFIER", "PI"  , _ ],
          [ ")"         , ")"   , _ ],
          [ "TERMINATOR", "\n"  , _ ],
        ];
        var actual = compiler.replacePi(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("replacePrecedence:", function() {
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
        var actual = compiler.replacePrecedence(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceBinaryOp:", function() {
      it("a + b => a.__add__(b)", function() {
        var tokens = [
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"      , _ ],
          [ "."         , "."      , _ ],
          [ "IDENTIFIER", "__add__", _ ],
          [ "CALL_START", "("      , _ ],
          [ "IDENTIFIER", "b"      , _ ],
          [ "CALL_END"  , ")"      , _ ],
          [ "TERMINATOR", "\n"     , _ ],
        ];
        var actual = compiler.replaceBinaryOp(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceUnaryOp:", function() {
      it("+a + a => a.num() + a", function() {
        var tokens = [
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"  , _ ],
          [ "."         , "."  , _ ],
          [ "IDENTIFIER", "num", _ ],
          [ "CALL_START", "("  , _ ],
          [ "CALL_END"  , ")"  , _ ],
          [ "+"         , "+"  , _ ],
          [ "IDENTIFIER", "a"  , _ ],
          [ "TERMINATOR", "\n" , _ ],
        ];
        var actual = compiler.replaceUnaryOp(tokens);
        assert.deepEqual(actual, expected);
      });
      it("-a + a => a.neg() + a", function() {
        var tokens = [
          [ "-"         , "-" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"  , _ ],
          [ "."         , "."  , _ ],
          [ "IDENTIFIER", "neg", _ ],
          [ "CALL_START", "("  , _ ],
          [ "CALL_END"  , ")"  , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "TERMINATOR", "\n" , _ ],
        ];
        var actual = compiler.replaceUnaryOp(tokens);
        assert.deepEqual(actual, expected);
      });
      it("(~-[]) => ([].neg().tilde())", function() {
        var tokens = [
          [ "("         , "(" , _ ],
          [ "UNARY"     , "~" , _ ],
          [ "UNARY"     , "-" , _ ],
          [ "["         , "[" , _ ],
          [ "]"         , "]" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "("    , _ ],
          [ "["         , "["    , _ ],
          [ "]"         , "]"    , _ ],
          [ "."         , "."    , _ ],
          [ "IDENTIFIER", "neg"  , _ ],
          [ "CALL_START", "("    , _ ],
          [ "CALL_END"  , ")"    , _ ],
          [ "."         , "."    , _ ],
          [ "IDENTIFIER", "tilde", _ ],
          [ "CALL_START", "("    , _ ],
          [ "CALL_END"  , ")"    , _ ],
          [ ")"         , ")"    , _ ],
          [ "TERMINATOR", "\n"   , _ ],
        ];
        var actual = compiler.replaceUnaryOp(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("replaceCompoundAssign:", function() {
      it("a.a += b.b => a.a = a.a.__add__(b.b)", function() {
        var tokens = [
          [ "IDENTIFIER"     , "a" , _ ],
          [ "."              , "." , _ ],
          [ "IDENTIFIER"     , "a" , _ ],
          [ "COMPOUND_ASSIGN", "+=", _ ],
          [ "IDENTIFIER"     , "b" , _ ],
          [ "."              , "." , _ ],
          [ "IDENTIFIER"     , "b" , _ ],
          [ "TERMINATOR"     , "\n", _ ],
        ];
        var expected = [
          [ "IDENTIFIER", "a"      , _ ],
          [ "."         , "."      , _ ],
          [ "IDENTIFIER", "a"      , _ ],
          [ "="         , "="      , _ ],
          [ "IDENTIFIER", "a"      , _ ],
          [ "."         , "."      , _ ],
          [ "IDENTIFIER", "a"      , _ ],
          [ "."         , "."      , _ ],
          [ "IDENTIFIER", "__add__", _ ],
          [ "CALL_START", "("      , _ ],
          [ "IDENTIFIER", "b"      , _ ],
          [ "."         , "."      , _ ],
          [ "IDENTIFIER", "b"      , _ ],
          [ "CALL_END"  , ")"      , _ ],
          [ "TERMINATOR", "\n"     , _ ],
        ];
        var actual = compiler.replaceCompoundAssign(tokens);
        assert.deepEqual(actual, expected);
      });
    });
    describe("cleanupParenthesis:", function() {
      it("((a + b)) => (a + b)", function() {
        var tokens = [
          [ "("         , "(" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = [
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var actual = compiler.cleanupParenthesis(tokens);
        assert.deepEqual(actual, expected);
      });
      it("((a + b) + c) => ((a + b) + c)", function() {
        var tokens = [
          [ "("         , "(" , _ ],
          [ "("         , "(" , _ ],
          [ "IDENTIFIER", "a" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "b" , _ ],
          [ ")"         , ")" , _ ],
          [ "+"         , "+" , _ ],
          [ "IDENTIFIER", "c" , _ ],
          [ ")"         , ")" , _ ],
          [ "TERMINATOR", "\n", _ ],
        ];
        var expected = tokens;
        var actual = compiler.cleanupParenthesis(tokens);
        assert.deepEqual(actual, expected);
      });
    });    
  });

});
