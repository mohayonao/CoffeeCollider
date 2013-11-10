define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var coffee = require("coffee-script");

  var cc = require("../../cc");
  var compiler = require("./coffee");
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
  
  describe("coffee.js", function() {
    var testSuite;
    before(function() {
      testSuite = function(func, code, expected, show) {
        var tokens = func(coffee.tokens(code));
        var actual = compiler.prettyPrint(tokens);
        if (show) {
          console.log(actual);
          console.log("-----");
        }
        assert.equal(actual, expected, code);
        assert.doesNotThrow(function() {
          coffee.nodes(tokens).compile();
        }, code);
      };
    });
    describe("detectPlusMinusOperator", function() {
      var tokens;
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
      var tokens, op;
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
      var tokens, code, op;
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
        code = [
          "Synth.def ->",
          "  1000",
          ".play()"
        ].join("\n");
        tokens = coffee.tokens(code);
        op = compiler.getNextOperand(tokens, 4); // ->
        assert.equal(tokens[op.end  ][TAG], "OUTDENT");
        assert.equal(tokens[op.end+1][TAG], "CALL_END");
      });
      it("FUCTION 2", function() {
        code = [
          "a (a=0)->",
          "  @f 1",
          "  @g 2",
          "b = 0"
        ].join("\n");
        tokens = coffee.tokens(code);
        op = compiler.getNextOperand(tokens, 1); // from ->
        assert.equal(tokens[op.end  ][TAG], "OUTDENT");
        assert.equal(tokens[op.end+1][TAG], "CALL_END");
      });
    });
    describe("detectFunctionParameters", function() {
      var tokens, code, actual;
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
        code = [
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
        tokens = coffee.tokens(code);
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
      var tokens;
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
      var code, expected;
      it("basis", function() {
        code     = "0 * (10 + 20 * 30 - 40 / 50)";
        expected = "(0 * (10 + (20 * 30) - (40 / 50)))";
        testSuite(compiler.replaceStrictlyPrecedence, code, expected);
      });
    });
    it("replaceUnaryOperator", function() {
      var code, expected;
      code     = "+10 + -[20]";
      expected = "10.__plus__() + [20].__minus__()";
      testSuite(compiler.replaceUnaryOperator, code, expected);
    });
    it("replaceTextBinaryAdverb (issue-33)", function() {
      var code, actual, expected;
      code     = "1 +S+ 2";
      expected = '1 + "#!S" + 2';
      actual = compiler.replaceTextBinaryAdverb(code);
      assert.equal(actual, expected);

      code     = "1 *CLIP* 2";
      expected = '1 * "#!C" * 2';
      actual = compiler.replaceTextBinaryAdverb(code);
      assert.equal(actual, expected);

      code     = "1 *CLI* 2";
      expected = "1 *CLI* 2";
      actual = compiler.replaceTextBinaryAdverb(code);
      assert.equal(actual, expected);

      code     = "1 *S+ 2";
      expected = "1 *S+ 2";
      actual = compiler.replaceTextBinaryAdverb(code);
      assert.equal(actual, expected);
    });
    describe("replaceBinaryOperator", function() {
      var code, expected;
      it("basis", function() {
        code     = "+10 + -[20]";
        expected = "+10.__add__(-[20])";
        testSuite(compiler.replaceBinaryOperator, code, expected);
      });
      it("issue-33", function() {
        code     = "+10 +F+ -[20]";
        code     = compiler.replaceTextBinaryAdverb(code);
        expected = "+10.__add__(-[20], FOLD)";
        testSuite(compiler.replaceBinaryOperator, code, expected);
        
        code     = '+10 +"#!F"+ -[20]';
        expected = "+10.__add__(-[20], FOLD)";
        testSuite(compiler.replaceBinaryOperator, code, expected);
      });
    });
    it("replaceCompoundAssign", function() {
      var code, expected;
      code     = "a.a += 10";
      expected = "a.a = a.a.__add__(10)";
      testSuite(compiler.replaceCompoundAssign, code, expected);
    });
    it("replaceLogicOperator", function() {
      var code, expected;
      code     = "10 && 20 || 30";
      expected = "10 && 20 || 30";
      testSuite(compiler.replaceLogicOperator, code, expected);

      code     = "@wait 10 && 20 || 30";
      expected = "@wait(10.__and__(20).__or__(30))";
      testSuite(compiler.replaceLogicOperator, code, expected);

      code     = "@wait 10 && (20||30), 40 || 50";
      expected = "@wait(10.__and__((20 || 30)), 40 || 50)";
      testSuite(compiler.replaceLogicOperator, code, expected);
    });
    describe("replaceSynthDefinition", function() {
      var code, expected;
      it("basis", function() {
        code = [
          "SynthDef ->",
          "  1000",
          ".play()"
        ].join("\n");
        expected = [
          "SynthDef(->",
          "  1000",
          ", []).play()"
        ].join("\n");
        testSuite(compiler.replaceSynthDefinition, code, expected);
      });
      it("with def args", function() {
        code = [
          "SynthDef (out, freq=440, amp=[1,2])->",
          "  1000",
          ".play()"
        ].join("\n");
        expected = [
          "SynthDef((out, freq, amp)->",
          "  1000",
          ", ['out', '0', 'freq', '440', 'amp', '[1,2]']).play()"
        ].join("\n");
        testSuite(compiler.replaceSynthDefinition, code, expected);
      });
      it("with other args", function() {
        code = [
          "SynthDef('test', (a={}, b='')->",
          "  1000",
          ", 1000).play()"
        ].join("\n");
        expected = [
          "SynthDef('test', (a, b)->",
          "  1000",
          ", ['a', '{}', 'b', '\"\"'], 1000).play()"
        ].join("\n");
        testSuite(compiler.replaceSynthDefinition, code, expected);
      });
      it("issue-30", function() {
        code = [
          "SynthDef ->",
          "  func(->",
          "    SinOsc.ar(440)",
          "  ) * 0"
        ].join("\n");
        expected = [
          "SynthDef(->",
          "  func(->",
          "    SinOsc.ar(440)",
          "  ) * 0",
          ", [])"
        ].join("\n");
        testSuite(compiler.replaceSynthDefinition, code, expected);
      });
    });
    describe("replaceTaskFunction", function() {
      var code, actual, expected;
      it("case 1", function() {
        code = [
          "t = Task (i)->",
          "  @func(a:0)",
          "  @wait 100",
          "  @break()",
          "  @continue()",
          "  @redo()",
          "  @func()",
          "  @func()",
        ].join("\n");
        expected = [
          "t = Task(->",
          "  [",
          "    (i)->",
          "      @func({a:0})",
          "      @wait(100)",
          "    (i)->",
          "      @break()",
          "    (i)->",
          "      @continue()",
          "    (i)->",
          "      @redo()",
          "    (i)->",
          "      @func()",
          "      @func()",
          "  ]",
          ")"
        ].join("\n");
        testSuite(compiler.replaceTaskFunction, code, expected);
      });
      it("case 2", function() {
        code = [
          "Task.do (i)->",
          "  a = 100",
          "  if true",
          "    @wait 100",
          "  [b, c] = [200, 300]",
          "  @break()",
          ".play()"
        ].join("\n");
        expected = [
          "Task.do(->",
          "  a = b = c = undefined",
          "  [",
          "    (i)->",
          "      a = 100",
          "      if true",
          "        @wait(100)",
          "    (i)->",
          "      [b, c] = [200, 300]",
          "      @break()",
          "  ]",
          ").play()"
        ].join("\n");
        testSuite(compiler.replaceTaskFunction, code, expected);
      });
      it("case 3", function() {
        code = [
          "func = Task func",
          "func = (i)->",
          "  100",
        ].join("\n");
        expected = [
          "func = Task(func)",
          "func = (i)->",
          "  100",
        ].join("\n");
        testSuite(compiler.replaceTaskFunction, code, expected);
      });
      it("case 4", function() {
        code = [
          "func = Task.do(func).on 'end', ->",
          "  100"
        ].join("\n");
        expected = [
          "func = Task.do(func).on('end', ->",
          "  100",
          ")"
        ].join("\n");
        testSuite(compiler.replaceTaskFunction, code, expected);
      });
      it("case 5", function() {
        code = [
          "def = make()",
          "Task.do (i)->", // outer:[def], local:[s1, t]
          "  s1 = def.play()",
          "  @wait Task.each [500, 250, 500], (n, i)->", // outer:[s1, def], local:[t, x]
          "    s1.set()",
          "    x = n",
          "    t = Task.interval 100, (i)->", // outer:[x, def], local:[s2, y]
          "      x = i",
          "      y = i * 2",
          "      s2 = def.play(x, y).on 'end', (i)->", // outer:[s2, y], local:[z]
          "        y = 10",
          "        z = 20",
          "        s2.stop()",
          "    .play()",
          "    @wait x",
          "    t.stop()",
          "  .play()",
          "  @wait Task.do ->", // outer:[], local:[]
          "    @wait 50",
          "  .play()",
          "  t = 1000",
          "  @wait t",
          ".play()"
        ].join("\n");
        
        expected = [
          "def = make()",
          "Task.do(do (def)->", // outer:[def], local:[s1, t]
          "  ->",
          "    s1 = t = undefined",
          "    [",
          "      (i)->",
          "        s1 = def.play()",
          "        @wait(Task.each([500, 250, 500], do (s1, def)->", // outer:[s1, def], local:[t, x]
          "          ->",
          "            x = t = undefined",
          "            [",
          "              (n, i)->",
          "                s1.set()",
          "                x = n",
          "                t = Task.interval(100, do (x, def)->", // outer:[x, def], local:[s2, y]
          "                  ->",
          "                    y = s2 = undefined",
          "                    [",
          "                      (i)->",
          "                        x = i",
          "                        y = i * 2",
          "                        s2 = do (y, s2)->", // outer:[s2, y], local:[z]
          "                          s2 = def.play(x, y).on('end', (i)->",
          "                            y = 10",
          "                            z = 20",
          "                            s2.stop()",
          "                          )",
          "                    ]",
          "                ).play()",
          "                @wait(x)",
          "              (n, i)->",
          "                t.stop()",
          "            ]",
          "        ).play())",
          "      (i)->",
          "        @wait(Task.do(->", // outer:[], local:[]
          "          [",
          "            ->",
          "              @wait(50)",
          "          ]",
          "        ).play())",
          "      (i)->",
          "        t = 1000",
          "        @wait(t)",
          "    ]",
          ").play()"
        ].join("\n");
        testSuite(compiler.replaceTaskFunction, code, expected);
      });
    });
    describe("replaceGlobalVariables", function() {
      var code, actual, expected;
      it("basis", function() {
        code     = "[$, $123, $__, $isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
        expected = "[$, $123, $__, global.isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
        testSuite(compiler.replaceGlobalVariables, code, expected);
      });
      it("object-key", function() {
        code     = "{$key:$val}";
        expected = "{$key:global.val}";
        testSuite(compiler.replaceGlobalVariables, code, expected);
      });
    });
    describe("replaceCCVariables", function() {
      var code, actual, expected;
      before(function() {
        cc.global.Global = true;
      });
      it("basis", function() {
        code     = "[Global, NotGlobal]";
        expected = "[cc.Global, NotGlobal]";
        testSuite(compiler.replaceCCVariables, code, expected);
      });
      it("member", function() {
        code     = "[a.Global, @Global]";
        expected = "[a.Global, @Global]";
        testSuite(compiler.replaceCCVariables, code, expected);
      });
      it("object-key", function() {
        code     = "{Global:Global}";
        expected = "{Global:cc.Global}";
        testSuite(compiler.replaceCCVariables, code, expected);
      });
    });
    describe("finalize", function() {
      var code, actual, expected;
      it("basis", function() {
        code     = "100";
        expected = [
          "((global)->",
          "  100",
          ").call(cc.__context__, this.self || global)",
        ].join("\n");
        testSuite(compiler.finalize, code, expected);
      });
    });
    describe("Compiler", function() {
      before(function() {
        compiler.use();
      });
      it("compile", function() {
        var code, c, actual;
        code = [
          "###comment###",
          "[1,2,3]"
        ].join("\n");
        
        c = cc.createCoffeeCompiler();
        actual = eval(c.compile(code));
        assert.deepEqual(actual, [1,2,3]);
        assert.deepEqual(c.data, ["comment"]);
        
        actual = eval(c.compile(""));
        assert.isUndefined(actual);
        assert.deepEqual(c.data, []);
      });
      it("toString", function() {
        var code, c;
        code = [
          "###comment###",
          "def (a=0)->",
          "  a += ~1",
          "  return {typeof:typeof 2}",
        ].join("\n");
        c = cc.createCoffeeCompiler();
        assert.doesNotThrow(function() {
          c.toString(code);
          var out = c.toString(c.tokens(code));
          // console.log(out);
        });
      });
    });
  });

});
