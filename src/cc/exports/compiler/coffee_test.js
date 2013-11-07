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
      testSuite = function(func, code, expected) {
        var tokens = func(coffee.tokens(code));
        var actual = compiler.prettyPrint(tokens);
        assert.equal(actual, expected, code);
        assert.doesNotThrow(function() {
          coffee.nodes(tokens).compile();
        }, code);
      };
    });
    it("detectPlusMinusOperator", function() {
      var tokens;
      tokens = coffee.tokens("+10");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.equal(tokens[0][TAG], "UNARY");

      tokens = coffee.tokens("-10");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.equal(tokens[0][TAG], "UNARY");
      
      tokens = coffee.tokens("a + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["IDENTIFIER", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("1 + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["NUMBER", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("'a' + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["STRING", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("/a/ + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["REGEX", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("true + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["BOOL", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("null + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["NULL", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("undefined + 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["UNDEFINED", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("[] - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["[", "]", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("{} - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["{", "}", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("(0) - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["(", "NUMBER", ")", "MATH", "NUMBER", "TERMINATOR"]
      );

      tokens = coffee.tokens("a() - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["IDENTIFIER", "CALL_START", "CALL_END", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("a[0] - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["IDENTIFIER", "INDEX_START", "NUMBER", "INDEX_END", "MATH", "NUMBER", "TERMINATOR"]
      );
      
      tokens = coffee.tokens("(0) - 0");
      tokens = compiler.detectPlusMinusOperator(tokens);
      tokens = compiler.detectPlusMinusOperator(tokens);
      tokens = compiler.revertPlusMinusOperator(tokens);
      tokens = compiler.revertPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["(", "NUMBER", ")", "-", "NUMBER", "TERMINATOR"]
      );
    });
    it("getPrevOperand", function() {
      var tokens, op;
      tokens = coffee.tokens("");
      op = compiler.getPrevOperand(tokens, 0);
      assert.equal(op.begin, 0);
      assert.equal(op.end  , 0);
      
      tokens = coffee.tokens("$.nothere");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "$", "BOD");
      
      tokens = coffee.tokens("a = $.nothere");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "$", "id is headable");
      
      tokens = coffee.tokens("a = 10");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "10", "number is headable");

      tokens = coffee.tokens("a = true");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "true", "bool is headable");
      
      tokens = coffee.tokens("a = 'str'");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "'str'", "string is headable");

      tokens = coffee.tokens("a = /.+/");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "/.+/", "regex is headable");

      tokens = coffee.tokens("a = undefined");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "undefined", "undefined is headable");

      tokens = coffee.tokens("a = null");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "null", "null is headable");

      tokens = coffee.tokens("a = ((100))");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin  ][VALUE], "(", "( is headable");
      assert.equal(tokens[op.begin+1][VALUE], "(", "( is headable (nest error)");

      tokens = coffee.tokens("a = [[100], 200]");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin  ][VALUE], "[", "[ is headable");
      assert.equal(tokens[op.begin+1][VALUE], "[", "[ is headable (nest error)");

      tokens = coffee.tokens("a = {a:{b:100}, c:200}");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin  ][VALUE], "{", "{ is headable");
      assert.equal(tokens[op.begin+1][VALUE], "a", "{ is headable (nest error)");

      tokens = coffee.tokens("a = @b");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "@", "@ is headable");

      tokens = coffee.tokens("a = this.b");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "this", "this is headable");

      tokens = coffee.tokens("a = super.b");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "super", "super is headable");

      tokens = coffee.tokens("a = -> 100");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "->", "-> is headable");

      tokens = coffee.tokens("a = (a)-> 100");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "(", "PARAM_START is headable");
      
      tokens = coffee.tokens("a = ~-+!100");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "~", "unary op is headable");

      tokens = coffee.tokens("a = Math.sin 1.57");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "Math", "calling is headable");
      
      tokens = coffee.tokens("a[0..1]");
      op = compiler.getPrevOperand(tokens, tokens.length-1);
      assert.equal(tokens[op.begin][VALUE], "a", "index start is not headable");
    });
    it("getNextOperand", function() {
      var tokens, code, op;
      tokens = coffee.tokens("");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(op.begin, 0);
      assert.equal(op.end  , 0);
      
      tokens = coffee.tokens("$.here");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "here", "EOD");
      
      tokens = coffee.tokens("a + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "a", "identifier is tailable");
      
      tokens = coffee.tokens("10 + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "10", "number is tailable");

      tokens = coffee.tokens("true + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "true", "bool is tailable");
      
      tokens = coffee.tokens("'str' + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "'str'", "string is tailable");

      tokens = coffee.tokens("/a/ + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "/a/", "regexp is tailable");
      
      tokens = coffee.tokens("undefined + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "undefined", "undefined is tailable");
      
      tokens = coffee.tokens("null + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "null", "null is tailable");

      tokens = coffee.tokens("((100)) + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end  ][VALUE], ")", ") is tailable");
      assert.equal(tokens[op.end-1][VALUE], ")", ") is tailable (nest error)");
      
      tokens = coffee.tokens("[100, [200]] + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end  ][VALUE], "]", "] is tailable");
      assert.equal(tokens[op.end-1][VALUE], "]", "] is tailable (nest error)");

      tokens = coffee.tokens("{a:100, b:{c:200}} + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end  ][VALUE], "}", "} is tailable");
      assert.equal(tokens[op.end-1][VALUE], "}", "} is tailable (nest error)");

      tokens = coffee.tokens("@a + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "a", "@ is NOT tailable");
      
      tokens = coffee.tokens("@ + 1");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][TAG], "@", "@ only is tailable");
      
      tokens = coffee.tokens("-> 100\n0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][TAG], "OUTDENT", "end of function is tailable");

      tokens = coffee.tokens("(a)-> 10\n0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][TAG], "OUTDENT", "end of function is tailable");

      tokens = coffee.tokens("~-+!100 + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], "100", "end of function is tailable");

      tokens = coffee.tokens("Math.cos(0) + 0");
      op = compiler.getNextOperand(tokens, 0);
      assert.equal(tokens[op.end][VALUE], ")", "end of calling is tailable");
      
      tokens = coffee.tokens("+10 + -[20]");
      op = compiler.getNextOperand(tokens, 2);
      assert.equal(tokens[op.end][VALUE], "]", "with index");
      
      tokens = coffee.tokens("1 + [2,3].pop() + 4");
      op = compiler.getNextOperand(tokens, 2);
      assert.equal(tokens[op.end][TAG], "CALL_END", ".");
      
      tokens = coffee.tokens("a = a[0..1] + 1");
      op = compiler.getNextOperand(tokens, 2);
      assert.equal(tokens[op.end][TAG], "INDEX_END", "index end is tailable");
      
      code = [
        "Synth.def ->",
        "  1000",
        ".play()"
      ].join("\n");
      tokens = coffee.tokens(code);
      op = compiler.getNextOperand(tokens, 4); // from ->
      assert.equal(tokens[op.end  ][TAG], "OUTDENT" , "function");
      assert.equal(tokens[op.end+1][TAG], "CALL_END", "function");
      
      code = [
        "a (a=0)->",
        "  @f 1",
        "  @g 2",
        "b = 0"
      ].join("\n");
      tokens = coffee.tokens(code);
      op = compiler.getNextOperand(tokens, 1); // from ->
      assert.equal(tokens[op.end  ][TAG], "OUTDENT" , "function");
      assert.equal(tokens[op.end+1][TAG], "CALL_END", "function");
    });
    it("detectFunctionParameters", function() {
      var tokens, code, actual;
      var crawlLocalVars = function(tokens) {
        var list = [ tokens.cc_localVars ];
        tokens.forEach(function(token) {
          if (token.cc_localVars) {
            list.push(token.cc_localVars.sort());
          }
        });
        return list;
      };
      var crawlOuterVars = function(tokens) {
        var list = [];
        tokens.forEach(function(token) {
          if (token.cc_outerVars) {
            list.push(token.cc_outerVars.sort());
          }
        });
        return list;
      };
      code = [
        "a = b = c = d = e = f = 10",
        "g = (h, i, j)->",
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
    });
    it("replaceFixedTimeValue", function() {
      var tokens;
      tokens = coffee.tokens('"10min"');
      tokens = compiler.replaceFixedTimeValue(tokens);
      assert.equal(tokens[0][TAG]  , "NUMBER");
      assert.equal(tokens[0][VALUE], "600");
      
      tokens = coffee.tokens('"str"');
      tokens = compiler.replaceFixedTimeValue(tokens);
      assert.equal(tokens[0][TAG]  , "STRING");
      assert.equal(tokens[0][VALUE], '"str"', "not replace");
      
      tokens = coffee.tokens("'10min'");
      tokens = compiler.replaceFixedTimeValue(tokens);
      assert.equal(tokens[0][VALUE], "'10min'", "not replace when use single quotation");
    });
    it("replaceStrictlyPrecedence", function() {
      var code, expected;
      code     = "0 * (10 + 20 * 30 - 40 / 50)";
      expected = "(0 * (10 + (20 * 30) - (40 / 50)))";
      testSuite(compiler.replaceStrictlyPrecedence, code, expected);
    });
    it("replaceUnaryOperator", function() {
      var code, expected;
      code     = "+10 + -[20]";
      expected = "10.__plus__() + [20].__minus__()";
      testSuite(compiler.replaceUnaryOperator, code, expected);
    });
    it("replaceBinaryOperator", function() {
      var code, expected;
      code     = "+10 + -[20]";
      expected = "+10.__add__(-[20])";
      testSuite(compiler.replaceBinaryOperator, code, expected);
      
      code     = "+10 +F+ -[20]";
      expected = "+10.__add__(-[20], FOLD)";
      testSuite(compiler.replaceBinaryOperator, code, expected);
      
      code     = "FOLD + -[20]";
      expected = "FOLD.__add__(-[20])";
      testSuite(compiler.replaceBinaryOperator, code, expected);
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
    it("replaceSynthDefinition", function() {
      var code, expected;
      code = [
        "Synth.def ->",
        "  1000",
        ".play()"
      ].join("\n");
      expected = [
        "Synth.def(->",
        "  1000",
        ", []).play()"
      ].join("\n");
      testSuite(compiler.replaceSynthDefinition, code, expected);
      
      code = [
        "Synth.def (out, freq=440, amp=[1,2])->",
        "  1000",
        ".play()"
      ].join("\n");
      expected = [
        "Synth.def((out, freq, amp)->",
        "  1000",
        ", ['out', '0', 'freq', '440', 'amp', '[1,2]']).play()"
      ].join("\n");
      testSuite(compiler.replaceSynthDefinition, code, expected);
      
      code = [
        "Synth.def((a={}, b='')->",
        "  1000",
        ", 1000).play()"
      ].join("\n");
      expected = [
        "Synth.def((a, b)->",
        "  1000",
        ", ['a', '{}', 'b', '\"\"'], 1000).play()"
      ].join("\n");
      testSuite(compiler.replaceSynthDefinition, code, expected);
    });
    it("replaceIteratorFunction", function() {
      var code, expected;
      code = [
        "i = Iterator ->",
        "  @yield 100",
        "  if true",
        "    @yield 200",
        "  else 0",
        "  a = => @yield 300",
        "  @yield 400",
      ].join("\n");
      expected = [
        "i = Iterator(->",
        "  a = undefined",
        "  [",
        "    ->",
        "      @yield(100)",
        "    ->",
        "      if true",
        "        @yield(200)",
        "      else",
        "        0",
        "    ->",
        "      a = =>",
        "        @yield(300)",
        "      @yield(400)",
        "  ]",
        ")"
      ].join("\n");
      testSuite(compiler.replaceIteratorFunction, code, expected);

      code = [
        "func = Iterator func",
        "func = (i)->",
        "  100",
      ].join("\n");
      expected = [
        "func = Iterator(func)",
        "func = (i)->",
        "  100",
      ].join("\n");
      testSuite(compiler.replaceIteratorFunction, code, expected);

      code = [
        "func = Iterator(func).on 'end', ->",
        "  100"
      ].join("\n");
      expected = [
        "func = Iterator(func).on('end', ->",
        "  100",
        ")"
      ].join("\n");
      testSuite(compiler.replaceIteratorFunction, code, expected);
    });
    it("replaceTaskFunction", function() {
      var code, actual, expected;
      code = [
        "t = Task (i)->",
        "  @func()",
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
        "      @func()",
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
      
      code = [
        "Task.do (i)->",
        "  a = 100",
        "  @wait 100",
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
        "      @wait(100)",
        "    (i)->",
        "      [b, c] = [200, 300]",
        "      @break()",
        "  ]",
        ").play()"
      ].join("\n");
      testSuite(compiler.replaceTaskFunction, code, expected);
      
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
      
      code = [
        "def = make()",
        "Task.do (i)->", // outer:[def], local:[s, t]
        "  s = def.play()",
        "  @wait Task.each [500, 250, 500], (n, i)->", // outer:[s, def], local:[t, x]
        "    s.set()",
        "    x = n",
        "    t = Task.interval 100, (i)->", // outer:[x, def], local:[y]
        "      x = i",
        "      y = i * 2",
        "      def.play(x, y).on 'end', (i)->", // outer:[y], local:[z]
        "        y = 10",
        "        z = 20",
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
        "Task.do(do (def)->", // outer:[def], local:[s, t]
        "  ->",
        "    s = t = undefined",
        "    [",
        "      (i)->",
        "        s = def.play()",
        "        @wait(Task.each([500, 250, 500], do (s, def)->", // outer:[s, def], local:[t, x]
        "          ->",
        "            x = t = undefined",
        "            [",
        "              (n, i)->",
        "                s.set()",
        "                x = n",
        "                t = Task.interval(100, do (x, def)->", // outer:[x, def], local:[y]
        "                  ->",
        "                    y = undefined",
        "                    [",
        "                      (i)->",
        "                        x = i",
        "                        y = i * 2", // outer:[y], local:[z]
        "                        def.play(x, y).on('end', do (y)->",
        "                          (i)->",
        "                            y = 10",
        "                            z = 20",
        "                        )",
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
    it("replaceGlobalVariables", function() {
      var code, actual, expected;
      code     = "[$, $123, $__, $isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
      expected = "[$, $123, $__, global.isGlobal, a.$isNotGlobal, @$isNotGlobal, $IsNotGlobal]";
      testSuite(compiler.replaceGlobalVariables, code, expected);
      
      code     = "{$key:$val}";
      expected = "{$key:global.val}";
      testSuite(compiler.replaceGlobalVariables, code, expected);
    });
    it("replaceCCVariables", function() {
      var code, actual, expected;
      cc.global.Global = true;
      
      code     = "[Global, NotGlobal]";
      expected = "[cc.Global, NotGlobal]";
      testSuite(compiler.replaceCCVariables, code, expected);

      code     = "[a.Global, @Global]";
      expected = "[a.Global, @Global]";
      testSuite(compiler.replaceCCVariables, code, expected);
      
      code     = "{Global:Global}";
      expected = "{Global:cc.Global}";
      testSuite(compiler.replaceCCVariables, code, expected);
    });
    it("finalize", function() {
      var code, actual, expected;
      code     = "100";
      expected = [
        "((global)->",
        "  100",
        ").call(cc.__context__, this.self || global)",
      ].join("\n");
      testSuite(compiler.finalize, code, expected);
    });
    it("getSynthDefArguments", function() {
      var tokens, code, actual, expected;
      code = "def ->";
      tokens = coffee.tokens(code);
      actual = compiler.getSynthDefArguments(tokens, 2);
      assert.deepEqual(actual, []);

      code = "def (a,b)->";
      tokens = coffee.tokens(code);
      actual = compiler.getSynthDefArguments(tokens, 2);
      assert.deepEqual(actual, ["a",0,"b",0]);
      
      code = "def (a={},b='')->";
      tokens = coffee.tokens(code);
      actual = compiler.getSynthDefArguments(tokens, 2);
      assert.deepEqual(actual, ["a","{}","b",'""']);

      code = "def (a={a:100,'200':300})->";
      tokens = coffee.tokens(code);
      actual = compiler.getSynthDefArguments(tokens, 2);
      assert.deepEqual(actual, ["a",'{"a":100,"200":300}']);
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
