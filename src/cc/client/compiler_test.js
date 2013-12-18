define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var coffee = require("coffee-script");

  var cc = require("../cc");
  var compiler = require("./compiler");
  var TAG   = 0;
  var VALUE = 1;
  
  var tab = function(n) {
    var t = "";
    for (var i = 0; i < n; ++i) {
      t += "  ";
    }
    return t;
  };
  
  var prettyPrint = function(tokens) {
    var indent = 0;
    tokens = compiler.detectPlusMinusOperator(tokens);
    return tokens.map(function(token) {
      switch (token[TAG]) {
      case "TERMINATOR":
        return "\n" + tab(indent);
      case "INDENT":
        indent += 1;
        return "\n" + tab(indent);
      case "OUTDENT":
        indent -= 1;
        return "\n" + tab(indent);
      case "RETURN":
        return "return ";
      case "UNARY":
        return token[VALUE] + (token[VALUE].length > 1 ? " " : "");
      case "{":
        return "{";
      case ",": case "RELATION": case "IF": case "ELSE": case "SWITCH": case "LEADING_WHEN":
        return token[VALUE] + " ";
      case "=": case "COMPARE": case "MATH": case "LOGIC":
        return " " + token[VALUE] + " ";
      case "HERECOMMENT":
        return "/* " + token[VALUE] + " */";
      default:
        return token[VALUE];
      }
    }).join("").split("\n").filter(function(line) {
      return !(/^\s*$/.test(line));
    }).join("\n").trim();
  };
  
  describe("client/compiler/coffee.js", function() {
    var actual, expected, tokens, code1, code2;
    describe("private methods", function() {
      var getIdentifier = function(token) {
        var val = token[VALUE];
        if (Array.isArray(val)) {
          return val.map(function(x) {
            return x != null ? x : "";
          }).join("");
        }
        if (val.reserved) {
          return val[0] + val[1] + (val[2]||"") + (val[3]||"") + (val[4]||"") +
            (val[5]||"") + (val[6]||"") + (val[7]||"");
        }
        if (typeof val === "number") {
          val = 2;
        }
        return val;
      };
      var testSuite = function(func, code1, code2, show) {
        var tokens1;
        if (code1.isTokens) {
          tokens1 = code1;
        } else {
          if (Array.isArray(code1)) {
            code1 = code1.join("\n");
          }
          tokens1 = coffee.tokens(code1);
        }
        tokens1 = compiler.detectFunctionParameters(tokens1);
        tokens1 = compiler.detectPlusMinusOperator(tokens1);
        var tokens1 = func(tokens1).map(function(x) {
          return [ x[0], x[1] ];
        });
        var result  = prettyPrint(tokens1);
        if (show & 1) {
          console.log("----- actual -----");
          console.log(result);
        }
        
        if (Array.isArray(code2)) {
          code2 = code2.join("\n");
        }
        var tokens2 = coffee.tokens(code2);
        
        var actual = coffee.tokens(result).map(function(token) {
          return [ token[0], getIdentifier(token) ];
        });
        var expected = tokens2.map(function(token) {
          return [ token[0], getIdentifier(token) ];
        });
        
        if (show & 1) {
          console.log("==== expected ====");
          console.log(prettyPrint(tokens2));
          console.log("------------------");
        }
        
        if (show & 2) {
          for (var i = 0, imax = actual.length; i < imax; ++i) {
            console.log("<<" + i + ">>");
            console.log("  ", actual[i])
            console.log("  ", expected[i]);
          }
        }    
        assert.deepEqual(actual, expected);
      };
      describe("indexOfParamEnd", function() {
        it("basis", function() {
          tokens = [
            ["IDENTIFIER" , "a" ],
            ["="          , "=" ],
            ["PARAM_START", "(" ],
            ["PARAM_END"  , ")" ], // <- here
            ["->"         , "->"],
            ["INDENT"     , 2   ],
            ["NUMBER"     , "0" ],
            ["OUTDENT"    , 2   ],
            ["TERMINATOR" , "\n"]
          ];
          actual   = compiler.indexOfParamEnd(tokens, 0);
          expected = 3;
          assert.equal(actual, expected);
        });
        it("nesting", function() {
          tokens = [
            ["IDENTIFIER" , "a" ],
            ["="          , "=" ],
            ["PARAM_START", "(" ],
            [  "IDENTIFIER" , "a" ],
            [  "="          , "=" ],
            [  "PARAM_START", "(" ],
            [  "PARAM_END"  , ")" ],
            [  "->"         , "->"],
            [  "INDENT"     , 2   ],
            [  "NUMBER"     , "0" ],
            [  "OUTDENT"    , 2   ],
            ["PARAM_END"  , ")" ], // <- here
            ["->"         , "->"],
            ["INDENT"     , 2   ],
            ["NUMBER"     , "0" ],
            ["OUTDENT"    , 2   ],
            ["TERMINATOR" , "\n"]
          ];
          actual   = compiler.indexOfParamEnd(tokens, 0);
          expected = 11;
          assert.equal(actual, expected);
        });
        it("none params", function() {
          tokens = [
            ["IDENTIFIER" , "a" ],
            ["="          , "=" ],
            ["->"         , "->"],
            ["INDENT"     , 2   ],
            ["NUMBER"     , "0" ],
            ["OUTDENT"    , 2   ],
            ["TERMINATOR" , "\n"]
          ];
          actual   = compiler.indexOfParamEnd(tokens, 0);
          expected = -1;
          assert.equal(actual, expected);
        });
      });
      describe("indexOfFunctionStart", function() {
        it("basis", function() {
          tokens = [
            ["IDENTIFIER" , "SynthDef"],
            ["CALL_START" , "("       ],
            ["STRING"     , "''"      ], // <- from
            [","          , ","       ],
            ["PARAM_START", "("       ], // <- here
            ["PARAM_END"  , ")"       ],
            ["->"         , "->"      ],
            ["INDENT"     , 2         ],
            ["NUMBER"     , "0"       ],
            ["OUTDENT"    , 2         ],
            ["CALL_END"   , ")"       ],
            ["TERMINATOR" , "\n"      ]
          ];
          actual   = compiler.indexOfFunctionStart(tokens, 2);
          expected = 4;
          assert.equal(actual, expected);
        });
        it("none args", function() {
          tokens = [
            ["IDENTIFIER" , "SynthDef"],
            ["CALL_START" , "("       ],
            ["STRING"     , "''"      ], // <- from
            [","          , ","       ],
            ["->"         , "->"      ],// <- here
            ["INDENT"     , 2         ],
            ["NUMBER"     , "0"       ],
            ["OUTDENT"    , 2         ],
            ["CALL_END"   , ")"       ],
            ["TERMINATOR" , "\n"      ]
          ];
          actual   = compiler.indexOfFunctionStart(tokens, 2);
          expected = 4;
          assert.equal(actual, expected);
        });
        it("not exists", function() {
          tokens = [
            ["IDENTIFIER" , "a" ],
            ["="          , "=" ],
            ["NUMBER"     , "0" ],
            ["TERMINATOR" , "\n"]
          ];
          actual   = compiler.indexOfFunctionStart(tokens, 0);
          expected = -1;
          assert.equal(actual, expected);
        });
        it("not exists", function() {
          tokens = [];
          actual   = compiler.indexOfFunctionStart(tokens, 0);
          expected = -1;
          assert.equal(actual, expected);
        });
      });
      describe("detectPlusMinusOperator", function() {
        var tagList = function(tokens) {
          return tokens.map(function(token) { return token[TAG] });
        };
        it("UNARY", function() {
          tokens = coffee.tokens("[+10, -10]");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), [
              "[", "UNARY", "NUMBER", ",", "UNARY", "NUMBER", "]", "TERMINATOR"
            ]
          );
        });
        it("MATH if following an identifier", function() {
          tokens = coffee.tokens("a + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["IDENTIFIER", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a number", function() {
          tokens = coffee.tokens("1 + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["NUMBER", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a string", function() {
          tokens = coffee.tokens("'a' + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["STRING", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a boolean", function() {
          tokens = coffee.tokens("true + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["BOOL", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a RegExp", function() {
          tokens = coffee.tokens("/a/ + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["REGEX", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a null", function() {
          tokens = coffee.tokens("null + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["NULL", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following an undefined", function() {
          tokens = coffee.tokens("undefined + 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["UNDEFINED", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following an array", function() {
          tokens = coffee.tokens("[] - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["[", "]", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following an object", function() {
          tokens = coffee.tokens("{} - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["{", "}", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a parenthesis", function() {
          tokens = coffee.tokens("(0) - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["(", "NUMBER", ")", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a function calling", function() {
          tokens = coffee.tokens("a() - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["IDENTIFIER", "CALL_START", "CALL_END", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("MATH if following a indexing", function() {
          tokens = coffee.tokens("a[0] - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["IDENTIFIER", "INDEX_START", "NUMBER", "INDEX_END", "MATH", "NUMBER", "TERMINATOR"]
          );
        });
        it("revert", function() {
          tokens = coffee.tokens("(0) - 0");
          tokens = compiler.detectPlusMinusOperator(tokens);
          tokens = compiler.revertPlusMinusOperator(tokens);
          assert.deepEqual(
            tagList(tokens), ["(", "NUMBER", ")", "-", "NUMBER", "TERMINATOR"]
          );
        });
      });
      describe("getPrevOperand", function() {
        var op;
        it("empty", function() {
          tokens = coffee.tokens("");
          op = compiler.getPrevOperand(tokens, 0);
          assert.equal(op.begin, 0);
          assert.equal(op.end  , 0);
        });
        it("BOD", function() {
          tokens = coffee.tokens("$.nothere");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "$");
        });
        it("IDENTIFIER", function() {
          tokens = coffee.tokens("a = $.nothere");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "$");
        });
        it("NUMBER", function() {
          tokens = coffee.tokens("a = 10");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "10");
        });
        it("BOOL", function() {
          tokens = coffee.tokens("a = true");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "true");
        });
        it("STRING", function() {
          tokens = coffee.tokens("a = 'str'");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "'str'");
        });
        it("REGEX", function() {
          tokens = coffee.tokens("a = /.+/");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "/.+/");
        });
        it("UNDEFINED", function() {
          tokens = coffee.tokens("a = undefined");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "undefined");
        });
        it("NULL", function() {
          tokens = coffee.tokens("a = null");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "null");
        });
        it("(", function() {
          tokens = coffee.tokens("a = ((100))");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin  ][VALUE], "(");
          assert.equal(tokens[op.begin+1][VALUE], "(", "nest error");
        });
        it("[", function() {
          tokens = coffee.tokens("a = [[100], 200]");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin  ][VALUE], "[", "[ is headable");
          assert.equal(tokens[op.begin+1][VALUE], "[", "[ is headable (nest error)");
        });
        it("{", function() {
          tokens = coffee.tokens("a = {a:{b:100}, c:200}");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin  ][VALUE], "{");
          assert.equal(tokens[op.begin+1][VALUE], "a", "nest error");
        });
        it("@", function() {
          tokens = coffee.tokens("a = @b");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "@");
        });
        it("THIS", function() {
          tokens = coffee.tokens("a = this.b");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "this");
        });
        it("SUPER", function() {
          tokens = coffee.tokens("a = super.b");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "super");
        });
        it("->", function() {
          tokens = coffee.tokens("a = -> 100");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "->");
        });
        it("=>", function() {
          tokens = coffee.tokens("a = => 100");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "=>");
        });
        it("PARAM_START", function() {
          tokens = coffee.tokens("a = (a)-> 100");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "(");
        });
        it("UNARY", function() {
          tokens = coffee.tokens("a = ~-+!100");
          tokens = compiler.detectPlusMinusOperator(tokens);
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "~");
        });
        it("!CALL_START", function() {
          tokens = coffee.tokens("a = Math.sin 1.57");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "Math");
        });
        it("!INDEX_START", function() {
          tokens = coffee.tokens("a[0..1]");
          op = compiler.getPrevOperand(tokens, tokens.length-1);
          assert.equal(tokens[op.begin][VALUE], "a");
        });
        it("issue-30", function() {
          tokens = coffee.tokens([
            "SynthDef ->",
            "  func(->",
            "    SinOsc.ar(440)",
            "  ) * 0"
          ].join("\n"));
          op = compiler.getPrevOperand(tokens, tokens.length-5); // *
          assert.equal(tokens[op.begin][VALUE], "func");
        });
      });
      describe("getNextOperand", function() {
        var op;
        it("empty", function() {
          tokens = coffee.tokens("");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(op.begin, 0);
          assert.equal(op.end  , 0);
        });
        it("EOD", function() {
          tokens = coffee.tokens("$.here");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "here");
        });
        it("IDENTIFIER", function() {
          tokens = coffee.tokens("a + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "a");
        });
        it("NUMBER", function() {
          tokens = coffee.tokens("10 + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "10");
        });
        it("BOOL", function() {
          tokens = coffee.tokens("true + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "true");
        });
        it("STRING", function() {
          tokens = coffee.tokens("'str' + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "'str'");
        });
        it("REGEX", function() {
          tokens = coffee.tokens("/a/ + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "/a/");
        });
        it("UNDEFINED", function() {
          tokens = coffee.tokens("undefined + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "undefined");
        });
        it("NULL", function() {
          tokens = coffee.tokens("null + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "null");
        });
        it(")", function() {
          tokens = coffee.tokens("((100)) + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end  ][VALUE], ")");
          assert.equal(tokens[op.end-1][VALUE], ")");
        });
        it("]", function() {
          tokens = coffee.tokens("[100, [200]] + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end  ][VALUE], "]");
          assert.equal(tokens[op.end-1][VALUE], "]");
        });
        it("}", function() {
          tokens = coffee.tokens("{a:100, b:{c:200}} + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end  ][VALUE], "}");
          assert.equal(tokens[op.end-1][VALUE], "}");
        });
        it("@", function() {
          tokens = coffee.tokens("@a + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "a");
          tokens = coffee.tokens("@ + 1");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][TAG], "@");
        });
        it("OUTDENT", function() {
          tokens = coffee.tokens("-> 100\n0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][TAG], "OUTDENT");
          tokens = coffee.tokens("(a)-> 10\n0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][TAG], "OUTDENT");
        });
        it("!UNARY", function() {
          tokens = coffee.tokens("~-+!100 + 0");
          op = compiler.getNextOperand(tokens, 0);
          assert.equal(tokens[op.end][VALUE], "100");
        });
        it("CALL_END", function() {
          tokens = coffee.tokens("1 + [2,3].pop() + 4");
          op = compiler.getNextOperand(tokens, 2);
          assert.equal(tokens[op.end][TAG], "CALL_END", ".");
        });
        it("INDEX_END", function() {
          tokens = coffee.tokens("+10 + -[20]");
          op = compiler.getNextOperand(tokens, 2);
          assert.equal(tokens[op.end][VALUE], "]");
          tokens = coffee.tokens("a = a[0..1] + 1");
          op = compiler.getNextOperand(tokens, 2);
          assert.equal(tokens[op.end][TAG], "INDEX_END");
        });
        it("FUNCTION 1", function() {
          code1 = [
            "Synth.def ->",
            "  1000",
            ".play()"
          ].join("\n");
          tokens = coffee.tokens(code1);
          op = compiler.getNextOperand(tokens, 4); // ->
          assert.equal(tokens[op.end  ][TAG], "OUTDENT");
          assert.equal(tokens[op.end+1][TAG], "CALL_END");
        });
        it("FUCTION 2", function() {
          code1 = [
            "a (a=0)->",
            "  @f 1",
            "  @g 2",
            "b = 0"
          ].join("\n");
          tokens = coffee.tokens(code1);
          op = compiler.getNextOperand(tokens, 1); // from ->
          assert.equal(tokens[op.end  ][TAG], "OUTDENT");
          assert.equal(tokens[op.end+1][TAG], "CALL_END");
        });
      });
      describe("detectFunctionParameters", function() {
        var crawlLocalVars = function(tokens) {
          var list = [ tokens.cc_funcParams.local ];
          tokens.forEach(function(token) {
            if (token.cc_funcParams) {
              list.push(token.cc_funcParams.local.sort());
            }
          });
          return list;
        };
        var crawlOuterVars = function(tokens) {
          var list = [];
          tokens.forEach(function(token) {
            if (token.cc_funcParams) {
              list.push(token.cc_funcParams.outer.sort());
            }
          });
          return list;
        };
        var crawlArgs = function(tokens) {
          var list = [];
          tokens.forEach(function(token) {
            if (token.cc_funcParams) {
              list.push(token.cc_funcParams.args);
            }
          });
          return list;
        };
        it("basic", function() {
          code1 = [
            "a = b = c = d = e = f = 10",
            "g = ([h], i=10, j=20)->",
            "  k = a + b",
            "  for l, [m, n] in j",
            "    o += i * m",
            "  global = p = ->",
            "    q = {g:d.c}",
            "    [r, [s, t]] = [e, f]",
            "  q = 10",
            "k = t = 10"
          ].join("\n");
          tokens = coffee.tokens(code1);
          tokens = compiler.detectFunctionParameters(tokens);
          actual = crawlLocalVars(tokens);
          assert.deepEqual(actual, [
            ["a","b","c","d","e","f","g","k","t"], ["k","l","m","n","o","p","q"], ["q","r","s","t"]
          ]);
          actual = crawlOuterVars(tokens);
          assert.deepEqual(actual, [
            ["a","b","d","e","f"], ["d","e","f"]
          ]);
          actual = crawlArgs(tokens);
          assert.deepEqual(actual, [
            [ "[h]", null, "i", "10", "j", "20" ], []
          ]);
        });
        it("case 2", function() {
          code1 = [
            "a = (b)->",
            "  syncblock (i)->",
            "    c = b * i"
          ].join("\n");
          tokens = coffee.tokens(code1);
          tokens = compiler.detectFunctionParameters(tokens);
          actual = crawlLocalVars(tokens);
          assert.deepEqual(actual, [
            ["a"], [], ["c"]
          ]);
          actual = crawlArgs(tokens);
          assert.deepEqual(actual, [
            [ "b", null ], [ "i", null ]
          ]);
        });
      });
      describe("replaceNumericString", function() {
        it("basic", function() {
          tokens = coffee.tokens('"10min"');
          tokens = compiler.replaceNumericString(tokens);
          assert.equal(tokens[0][TAG]  , "NUMBER");
          assert.equal(tokens[0][VALUE], "600");
        });
        it("pass through if not numeric string", function() {
          tokens = coffee.tokens('"str"');
          tokens = compiler.replaceNumericString(tokens);
          assert.equal(tokens[0][TAG]  , "STRING");
          assert.equal(tokens[0][VALUE], '"str"');
        });
        it("pass through if in single quotation string", function() {
          tokens = coffee.tokens("'10min'");
          tokens = compiler.replaceNumericString(tokens);
          assert.equal(tokens[0][TAG]  , "STRING");
          assert.equal(tokens[0][VALUE], "'10min'");
        });
      });
      describe("replaceStrictlyPrecedence", function() {
        it("basis", function() {
          code1 = "0 * (10 + 20 * 30 - 40 / 50)";
          code2 = "(0 * (10 + (20 * 30) - (40 / 50)))";
          testSuite(compiler.replaceStrictlyPrecedence, code1, code2);
        });
      });
      describe("replaceUnaryOperator", function() {
        it("basis", function() {
          code1 = "+10 + -[20]";
          code2 = "10.__plus__() + [20].__minus__()";
          testSuite(compiler.replaceUnaryOperator, code1, code2);
        });
        it("pass through", function() {
          code1 = "~10";
          code2 = "~10";
          testSuite(compiler.replaceUnaryOperator, code1, code2);
        });
      });
      describe("replaceTextBinaryAdverb", function() {
        it("basis", function() {
          code1    = "1 +S+ 2";
          expected = '1 + "#!S" + 2';
          actual = compiler.replaceTextBinaryAdverb(code1);
          assert.equal(actual, expected);
        });
        it("long name", function() {
          code1    = "1 *CLIP* 2";
          expected = '1 * "#!C" * 2';
          actual = compiler.replaceTextBinaryAdverb(code1);
          assert.equal(actual, expected);
        });
        it("wrong name", function() {
          code1    = "1 *CLI* 2";
          expected = "1 *CLI* 2";
          actual = compiler.replaceTextBinaryAdverb(code1);
          assert.equal(actual, expected);
        });
        it("not paired", function() {
          code1    = "1 *S+ 2";
          expected = "1 *S+ 2";
          actual = compiler.replaceTextBinaryAdverb(code1);
          assert.equal(actual, expected);
        });
      });
      describe("replaceBinaryOperatorAdverbs", function() {
        it("basis", function() {
          code1 = '10 + "#!C" + 20';
          code2 = '10 + 20';
          testSuite(compiler.replaceBinaryOperatorAdverbs, code1, code2);
        });
      });
      describe("replaceBinaryOperator", function() {
        it("basis", function() {
          code1 = [
            "+10 + -[20]",
            "+10 - -[20]",
            "+10 * -[20]",
            "+10 / -[20]",
            "+10 % -[20]",
          ];
          code2 = [
            "+10.__add__(-[20])",
            "+10.__sub__(-[20])",
            "+10.__mul__(-[20])",
            "+10.__div__(-[20])",
            "+10.__mod__(-[20])",
          ];
          testSuite(compiler.replaceBinaryOperator, code1, code2);
        });
        it("with adverb", function() {
          code1 = "+10 + -[20]";
          code2 = "+10.__add__(-[20], SHORT)";
          code1 = coffee.tokens(code1);
          code1[2][TAG] = "MATH";
          code1[2].adverb = "S";
          code1.isTokens  = true;
          testSuite(compiler.replaceBinaryOperator, code1, code2);
        });
      });
      describe("replaceCompoundAssign", function() {
        it("basis", function() {
          code1 = [
            "a.a += 10",
            "b.b -= 10",
            "c.c *= 10",
            "d.d /= 10",
            "e.e %= 10",
          ];
          code2 = [
            "a.a = a.a.__add__(10)",
            "b.b = b.b.__sub__(10)",
            "c.c = c.c.__mul__(10)",
            "d.d = d.d.__div__(10)",
            "e.e = e.e.__mod__(10)",
          ];
          testSuite(compiler.replaceCompoundAssign, code1, code2);
        });
      });
      describe("replaceSynthDefinition", function() {
        it("basis", function() {
          code1 = [
            "SynthDef ->",
            "  1000",
            ".play()"
          ];
          code2 = [
            "SynthDef(->",
            "  1000",
            ", []).play()"
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
        it("with def args", function() {
          code1 = [
            "SynthDef (out, freq=440, amp=[1,2])->",
            "  1000",
            ".play()"
          ];
          code2 = [
            "SynthDef((out, freq, amp)->",
            "  1000",
            ", ['out', '0', 'freq', '440', 'amp', '[1,2]']).play()"
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
        it("with other args", function() {
          code1 = [
            "SynthDef('test', (a={}, b='')->",
            "  1000",
            ", 1000).play()"
          ];
          code2 = [
            "SynthDef('test', (a, b)->",
            "  1000",
            ", ['a', '{}', 'b', '\"\"'], 1000).play()"
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
        it("not replace (member)", function() {
          code1 = [
            "cc.SynthDef ->",
            "  func(->",
            "    SinOsc.ar(440)",
            "  ) * 0"
          ];
          code2 = [
            "cc.SynthDef ->",
            "  func(->",
            "    SinOsc.ar(440)",
            "  ) * 0"
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
        it("not replace (not exists function)", function() {
          code1 = [
            "SynthDef a",
          ];
          code2 = [
            "SynthDef a",
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
        it("issue-30", function() {
          code1 = [
            "SynthDef ->",
            "  func(->",
            "    SinOsc.ar(440)",
            "  ) * 0"
          ];
          code2 = [
            "SynthDef(->",
            "  func(->",
            "    SinOsc.ar(440)",
            "  ) * 0",
            ", [])"
          ];
          testSuite(compiler.replaceSynthDefinition, code1, code2);
        });
      });
      describe("replaceSyncBlock", function() {
        it("case 1 (Task)", function() {
          code1 = [
            "t = Task ->",
            "  a = 100",
            "  b = [ 1, 2, 3 ].map (x)->",
            "    a * x",
          ];
          code2 = [
            "t = Task syncblock ->",
            "  a = b = undefined",
            "  [",
            "    ->",
            "      a = 100",
            "      b = [ 1, 2, 3 ].map (x)->",
            "        a * x",
            "  ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 2 (num.do)", function() {
          code1 = [
            "s = Synth()",
            "[ 1, 2, 3 ].do syncblock (i)->",
            "  s.set freq:(60+i).midicps()",
            "  0.1.wait()",
          ];
          code2 = [
            "s = Synth()",
            "[ 1, 2, 3 ].do syncblock ->",
            "  [",
            "    (i)->",
            "      s.set freq:(60+i).midicps()",
            "      0.1.wait()",
            "  ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 3 (nesting)", function() {
          code1 = [
            "t = Task ->",
            "  a = 100",
            "  1.wait()",
            "  s = Synth('test').on 'end', ->",
            "    s.stop()",
            "  [ 1, 2, 3 ].do syncblock (i)->",
            "    s.set freq:(60+i).midicps()",
            "    0.1.wait()",
            "t.start()",
          ];
          code2 = [
            "t = Task syncblock ->",
            "  a = s = undefined",
            "  [",
            "    ->",
            "      a = 100",
            "      1.wait()",
            "    ->",
            "      s = Synth('test').on 'end', ->",
            "        s.stop()",
            "      [ 1, 2, 3 ].do syncblock ->",
            "        [",
            "          (i)->",
            "            s.set freq:(60+i).midicps()",
            "            0.1.wait()",
            "        ]",
            "  ]",
            "t.start()",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 4 (if)", function() {
          code1 = [
            "Task ->",
            "  a = b = c = false",
            "  if a",
            "    0.1.wait()",
            "  else if b",
            "    0.2.wait()",
            "  else",
            "    if c",
            "      console.log c",
            "      0.3.wait()",
          ];
          code2 = [
            "Task syncblock ->",
            "  a = b = c = undefined",
            "  [",
            "    ->",
            "      a = b = c = false",
            "      if a",
            "        0.1.wait()",
            "      else if b",
            "        0.2.wait()",
            "      else",
            "        if c",
            "          console.log c",
            "          0.3.wait()",
            "  ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 5 (if syncblock)", function() {
          code1 = [
            "Task ->",
            "  a = b = c = false",
            "  if a then syncblock ->",
            "    0.1.wait()",
            "  else if b then syncblock ->",
            "    0.2.wait()",
            "  else syncblock ->",
            "    if c then syncblock ->",
            "      console.log c",
            "      0.3.wait()",
          ];
          code2 = [
            "Task syncblock ->",
            "  a = b = c = undefined",
            "  [",
            "    ->",
            "      a = b = c = false",
            "      if a",
            "        syncblock ->",
            "          [",
            "            -> 0.1.wait()",
            "          ]",
            "      else if b",
            "        syncblock ->",
            "          [",
            "            -> 0.2.wait()",
            "          ]",
            "      else",
            "        syncblock ->",
            "          [",
            "            -> if c",
            "              syncblock ->",
            "                [",
            "                  ->",
            "                    console.log c",
            "                    0.3.wait()",
            "                ]",
            "          ]",
            "  ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 6 (assign)", function() {
          code1 = [
            "10.do syncblock ([a, b, c], d)->",
            "  console.log a",
            "  1.wait()",
          ];
          code2 = [
            "10.do syncblock ->",
            "  [",
            "    ([a, b, c], d)->",
            "      console.log a",
            "      1.wait()",
            "  ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("case 7", function() {
          code1 = [
            "(out)->",
            "  syncblock (i)->",
            "    a = out * i"
          ];
          code2 = [
            "(out)->",
            "  syncblock ->",
            "    a = undefined",
            "    [",
            "      (i)-> a = out * i",
            "    ]",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
        it("not replace (not exists function)", function() {
          code1 = [
            "syncblock a",
          ];
          code2 = [
            "syncblock a",
          ];
          testSuite(compiler.replaceSyncBlock, code1, code2);
        });
      });
      describe("replaceGlobalVariables", function() {
        it("basis", function() {
          code1 = [
            "$",
            "$123",
            "$__",
            "$isGlobal", // target
            "a.$isNotGlobal",
            "@$isNotGlobal",
            "$IsNotGlobal",
            "{$isNotGlobal: $isGlobal}" // target
          ];
          code2 = [
            "$",
            "$123",
            "$__",
            "global.isGlobal", // replaced
            "a.$isNotGlobal",
            "@$isNotGlobal",
            "$IsNotGlobal",
            "{$isNotGlobal: global.isGlobal}" // replaced
          ];
          testSuite(compiler.replaceGlobalVariables, code1, code2);
        });
      });
      describe("replaceCCVariables", function() {
        before(function() {
          cc.global.Global = true;
        });
        it("basis", function() {
          code1 = [
            "Global",
            "NotGlobal",
            "a.Global",
            "@Global",
            "{Global: Global}",
          ];
          code2 = [
            "cc.Global",
            "NotGlobal",
            "a.Global",
            "@Global",
            "{Global: cc.Global}"
          ];
          testSuite(compiler.replaceCCVariables, code1, code2);
        });
      });
      describe("wrapWholeCode", function() {
        var code, actual, expected;
        it("basis", function() {
          code1 = "100";
          code2 = [
            "((global, cc)->",
            "  100",
            ").call(cc.__context__, this.self || global, cc)",
          ];
          testSuite(compiler.wrapWholeCode, code1, code2);
        });
      });
    });
    describe("Compiler", function() {
      var testSuite = function(code1, code2) {
        if (Array.isArray(code1)) {
          code1 = code1.join("\n");
        }
        if (Array.isArray(code2)) {
          code2 = code2.join("\n");
        }
        code1 = cc.createCompiler().compile(code1).trim();
        code2 = coffee.compile(code2, {bare:true}).trim();
        
        assert.equal(code1, code2);
      };
      var _global;
      before(function() {
        _global = cc.global;
        cc.global = {};
      });
      after(function() {
        cc.global = _global;
      });
      it("empty", function() {
        code1 = "";
        code2 = "";
        testSuite(code1, code2);
      });
      it("test", function() {
        cc.global.SynthDef = true;
        code1 = [
          "$a = SynthDef \"synth\", (amp=0.5, trig)->",
          "  freq = [ +\"A4\", -\"A4\" ].midicps() *S* [ 1, 1.005 ]",
          "  SinOsc.ar(freq) * Line.kr(\"1min\", 0, amp)",
          "syncblock (i, j)->",
          "  i += ~0",
          "  i.wait()",
          "  if j then syncblock ->",
          "    10.wait()",
          "  if true",
          "    x = 0",
        ];
        code2 = [
          "((global, cc)->",
          "  global.a = cc.SynthDef(\"synth\", (amp, trig)->",
          "    freq = [ 69.__plus__(), 69.__minus__() ].midicps().__mul__([ 1, 1.005 ], SHORT)",
          "    SinOsc.ar(freq).__mul__(Line.kr(60, 0, amp))",
          "  , [ 'amp', '0.5', 'trig', '0' ])",
          "  syncblock ->",
          "    x = undefined",
          "    [",
          "      (i, j)->",
          "        i = i.__add__(~0)",
          "        i.wait()",
          "      (i, j)->",
          "        if j then syncblock ->",
          "          [",
          "            -> 10.wait()",
          "          ]",
          "      (i, j)->",
          "        if true",
          "          x = 0",
          "    ]",
          ").call(cc.__context__, this.self || global, cc)",
        ];
        testSuite(code1, code2);
      });
      it("test2", function() {
        code1 = [
          "(out)->",
          "  syncblock (i)->",
          "    a = out * i"
        ];
        code2 = [
          "((global, cc)->",
          "  (out)->",
          "    syncblock ->",
          "      a = undefined",
          "      [",
          "        (i)-> a = out.__mul__(i)",
          "      ]",
          ").call(cc.__context__, this.self || global, cc)",
        ];
        testSuite(code1, code2);
      });
    });
  });

});
