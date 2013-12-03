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
  var dumpTokens = function(tokens, linenum) {
    var indent = 0;
    console.log(tokens.map(function(t, i) {
      switch (t[0]) {
      case "OUTDENT": case "CALL_END": case "PARAM_END": case "}": case "]": case ")":
        indent -= 1;
        break;
      }
      var x = tab(indent) + t[0] + "\t" + t[1];
      switch (t[0]) {
      case "(": case "[": case "{": case "PARAM_START": case "CALL_START": case "INDENT":
        indent += 1;
        break;
      }
      if (linenum) {
        x = ("   " + i).substr(-3) + ": " + x;
      }
      return x;
    }).join("\n"));
  };
  var tagList = function(tokens) {
    return tokens.map(function(token) {
      return token[TAG]
    });
  };

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
    if (Array.isArray(code1)) { code1 = code1.join("\n"); }
    if (Array.isArray(code2)) { code2 = code2.join("\n"); }
    
    var tokens1 = func(coffee.tokens(code1));
    var result  = compiler.prettyPrint(tokens1);
    if (show & 1) {
      console.log("----- actual -----");
      console.log(result);
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
      console.log(compiler.prettyPrint(tokens2));
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
    
    // assert.doesNotThrow(function() {
    //   coffee.nodes(tokens1).compile();
    // }, code1, "compile error");
  };
  
  describe("client/compiler/coffee.js", function() {
    var actual, expected, tokens, code1, code2;
    describe("detectPlusMinusOperator", function() {
      it("case 1", function() {
        tokens = coffee.tokens("+10");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.equal(tokens[0][TAG], "UNARY");
      });
      it("case 2", function() {
        tokens = coffee.tokens("-10");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.equal(tokens[0][TAG], "UNARY");
      });
      it("case 3", function() {
        tokens = coffee.tokens("a + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["IDENTIFIER", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 4", function() {
        tokens = coffee.tokens("1 + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["NUMBER", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 5", function() {
        tokens = coffee.tokens("'a' + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["STRING", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 6", function() {
        tokens = coffee.tokens("/a/ + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["REGEX", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 7", function() {
        tokens = coffee.tokens("true + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["BOOL", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 8", function() {
        tokens = coffee.tokens("null + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["NULL", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 9", function() {
        tokens = coffee.tokens("undefined + 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["UNDEFINED", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 10", function() {
        tokens = coffee.tokens("[] - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["[", "]", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 11", function() {
        tokens = coffee.tokens("{} - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["{", "}", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 12", function() {
        tokens = coffee.tokens("(0) - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["(", "NUMBER", ")", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 13", function() {
        tokens = coffee.tokens("a() - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["IDENTIFIER", "CALL_START", "CALL_END", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("case 14", function() {
        tokens = coffee.tokens("a[0] - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        assert.deepEqual(
          tagList(tokens), ["IDENTIFIER", "INDEX_START", "NUMBER", "INDEX_END", "MATH", "NUMBER", "TERMINATOR"]
        );
      });
      it("revert", function() {
        tokens = coffee.tokens("(0) - 0");
        tokens = compiler.detectPlusMinusOperator(tokens);
        tokens = compiler.detectPlusMinusOperator(tokens);
        tokens = compiler.revertPlusMinusOperator(tokens);
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
    });
    describe("replaceFixedTimeValue", function() {
      it("basic", function() {
        tokens = coffee.tokens('"10min"');
        tokens = compiler.replaceFixedTimeValue(tokens);
        assert.equal(tokens[0][TAG]  , "NUMBER");
        assert.equal(tokens[0][VALUE], "600");
      });
      it("pass", function() {
        tokens = coffee.tokens('"str"');
        tokens = compiler.replaceFixedTimeValue(tokens);
        assert.equal(tokens[0][TAG]  , "STRING");
        assert.equal(tokens[0][VALUE], '"str"', "not replace");
      });
      it("single quotation", function() {
        tokens = coffee.tokens("'10min'");
        tokens = compiler.replaceFixedTimeValue(tokens);
        assert.equal(tokens[0][VALUE], "'10min'", "not replace when use single quotation");
      });
    });
    describe("replaceStrictlyPrecedence", function() {
      it("basis", function() {
        code1 = "0 * (10 + 20 * 30 - 40 / 50)";
        code2 = "(0 * (10 + (20 * 30) - (40 / 50)))";
        testSuite(compiler.replaceStrictlyPrecedence, code1, code2);
      });
    });
    it("replaceUnaryOperator", function() {
      code1 = "+10 + -[20]";
      code2 = "10.__plus__() + [20].__minus__()";
      testSuite(compiler.replaceUnaryOperator, code1, code2);
    });
    it("replaceTextBinaryAdverb (issue-33)", function() {
      code1    = "1 +S+ 2";
      expected = '1 + "#!S" + 2';
      actual = compiler.replaceTextBinaryAdverb(code1);
      assert.equal(actual, expected);

      code1    = "1 *CLIP* 2";
      expected = '1 * "#!C" * 2';
      actual = compiler.replaceTextBinaryAdverb(code1);
      assert.equal(actual, expected);

      code1    = "1 *CLI* 2";
      expected = "1 *CLI* 2";
      actual = compiler.replaceTextBinaryAdverb(code1);
      assert.equal(actual, expected);

      code1    = "1 *S+ 2";
      expected = "1 *S+ 2";
      actual = compiler.replaceTextBinaryAdverb(code1);
      assert.equal(actual, expected);
    });
    describe("replaceBinaryOperator", function() {
      it("basis", function() {
        code1 = "+10 + -[20]";
        code2 = "+10.__add__(-[20])";
        testSuite(compiler.replaceBinaryOperator, code1, code2);
      });
      it("issue-33", function() {
        code1 = "+10 +F+ -[20]";
        code1 = compiler.replaceTextBinaryAdverb(code1);
        code2 = "+10.__add__(-[20], FOLD)";
        testSuite(compiler.replaceBinaryOperator, code1, code2);
        
        code1 = '+10 +"#!F"+ -[20]';
        code2 = "+10.__add__(-[20], FOLD)";
        testSuite(compiler.replaceBinaryOperator, code1, code2);
      });
    });
    it("replaceCompoundAssign", function() {
      code1 = "a.a += 10";
      code2 = "a.a = a.a.__add__(10)";
      testSuite(compiler.replaceCompoundAssign, code1, code2);
    });
    it("replaceLogicOperator", function() {
      code1 = "10 && 20 || 30";
      code2 = "10 && 20 || 30";
      testSuite(compiler.replaceLogicOperator, code1, code2);
      
      code1 = "@wait 10 && 20 || 30";
      code2 = "@wait(10.__and__(20).__or__(30))";
      testSuite(compiler.replaceLogicOperator, code1, code2);

      code1 = "@wait 10 && (20||30), 40 || 50";
      code2 = "@wait(10.__and__((20 || 30)), 40 || 50)";
      testSuite(compiler.replaceLogicOperator, code1, code2);
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
    });
    describe("replaceGlobalVariables", function() {
      it("basis", function() {
        code1 = "[$, $123, $__, $isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
        code2 = "[$, $123, $__, global.isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
        testSuite(compiler.replaceGlobalVariables, code1, code2);
      });
      it("object-key", function() {
        code1 = "{$key:$val}";
        code2 = "{$key:global.val}";
        testSuite(compiler.replaceGlobalVariables, code1, code2);
      });
    });
    describe("replaceCCVariables", function() {
      before(function() {
        cc.global.Global = true;
      });
      it("basis", function() {
        code1 = "[ Global   , NotGlobal ]";
        code2 = "[ cc.Global, NotGlobal ]";
        testSuite(compiler.replaceCCVariables, code1, code2);
      });
      it("member", function() {
        code1 = "[ a.Global, @Global ]";
        code2 = "[ a.Global, @Global ]";
        testSuite(compiler.replaceCCVariables, code1, code2);
      });
      it("object-key", function() {
        code1 = "{ Global: Global    }";
        code2 = "{ Global: cc.Global }";
        testSuite(compiler.replaceCCVariables, code1, code2);
      });
    });
    describe("finalize", function() {
      var code, actual, expected;
      it("basis", function() {
        code1 = "100";
        code2 = [
          "((global, cc, undefined)->",
          "  100",
          ").call(cc.__context__, this.self || global, cc)",
        ];
        testSuite(compiler.finalize, code1, code2);
      });
    });
    describe("Compiler", function() {
      it("compile", function() {
        code1 = [
          "[ 1, 2, 3 ]"
        ].join("\n");
        
        var c = cc.createCompiler();
        actual = eval(c.compile(code1));
        assert.deepEqual(actual, [ 1, 2, 3 ]);
        
        actual = eval(c.compile(""));
        assert.isUndefined(actual);
      });
      it("toString", function() {
        var code, c;
        code = [
          "###comment###",
          "def (a=0)->",
          "  a += ~1",
          "  return {typeof:typeof 2}",
        ].join("\n");
        c = cc.createCompiler();
        assert.doesNotThrow(function() {
          c.toString(code);
          var out = c.toString(c.tokens(code));
          // console.log(out);
        });
      });
    });
  });

});
