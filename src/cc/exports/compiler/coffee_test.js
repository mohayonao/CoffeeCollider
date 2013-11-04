define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var coffee = require("coffee-script");

  var cc = require("../../cc");
  var compiler = require("./coffee");
  var TAG   = 0;
  var VALUE = 1;

  var tab = function(n) {
    var t = ""; while (n--) { t += "  "; } return t;
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
  var detokens = function(tokens) {
    var indent = 0;
    return tokens.map(function(token) {
      switch (token[TAG]) {
      case "INDENT":
        indent += 1;
        return "\n";
      case "OUTDENT":
        indent -= 1;
        return "\n";
      }
      return tab(indent) + token[VALUE];
    }).join("");
  };
  
  var tagList = function(tokens) {
    return tokens.map(function(token) {
      return token[TAG]
    });
  };
  
  describe("coffee.js", function() {
    it("sortPlusMinusOperator", function() {
      var tokens;
      tokens = coffee.tokens("+10");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.equal(tokens[0][TAG], "UNARY");

      tokens = coffee.tokens("-10");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.equal(tokens[0][TAG], "UNARY");
      
      tokens = coffee.tokens("a + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["IDENTIFIER", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("1 + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["NUMBER", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("'a' + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["STRING", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("/a/ + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["REGEX", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("true + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["BOOL", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("null + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["NULL", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("undefined + 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["UNDEFINED", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("[] - 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["[", "]", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("{} - 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["{", "}", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = coffee.tokens("(0) - 0");
      tokens = compiler.sortPlusMinusOperator(tokens);
      assert.deepEqual(
        tagList(tokens), ["(", "NUMBER", ")", "MATH", "NUMBER", "TERMINATOR"]
      );
      tokens = compiler.sortPlusMinusOperator(tokens);
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
      
      code = [
        "Synth.def ->",
        "  1000",
        ".play()"
      ].join("\n");
      tokens = coffee.tokens(code);
      op = compiler.getNextOperand(tokens, 4); // from ->
      assert.equal(tokens[op.end][TAG], "OUTDENT", "function");
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
      var tokens, actual;
      tokens = coffee.tokens("0*(10+20*30-40/50)");
      tokens = compiler.replaceStrictlyPrecedence(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "(0*(10+(20*30)-(40/50)))");
    });
    it("replaceUnaryOperator", function() {
      var tokens, actual;
      tokens = coffee.tokens("+10 + -[20]");
      tokens = compiler.replaceUnaryOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "10.__plus__()+[20].__minus__()");
    });
    it("replaceBinaryOperator", function() {
      var tokens, actual;
      tokens = coffee.tokens("+10 + -[20]");
      tokens = compiler.replaceBinaryOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "+10.__add__(-[20])");

      tokens = coffee.tokens("+10 +F+ -[20]");
      tokens = compiler.replaceBinaryOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "+10.__add__(-[20],FOLD)");

      tokens = coffee.tokens("FOLD + -[20]");
      tokens = compiler.replaceBinaryOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "FOLD.__add__(-[20])");
    });
    it("replaceCompoundAssign", function() {
      var tokens, actual;
      tokens = coffee.tokens("a.a += 10");
      tokens = compiler.replaceCompoundAssign(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "a.a=a.a.__add__(10)");
    });
    it("replaceLogicOperator", function() {
      var tokens, actual;
      tokens = coffee.tokens("10 && 20 || 30");
      tokens = compiler.replaceLogicOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "10&&20||30");

      tokens = coffee.tokens("@wait 10 && 20 || 30");
      tokens = compiler.replaceLogicOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "@wait(10.__and__(20).__or__(30))");

      tokens = coffee.tokens("@wait 10 && (20||30), 40 || 50");
      tokens = compiler.replaceLogicOperator(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "@wait(10.__and__((20||30)),40||50)");
    });
    it("replaceSynthDefinition", function() {
      var tokens, code, actual, expected;
      code = [
        "Synth.def ->",
        "  1000",
        ".play()"
      ].join("\n");
      expected = [
        "Synth.def(->",
        "  1000",
        ",[]).play()"
      ].join("\n");
      tokens = coffee.tokens(code);
      tokens = compiler.replaceSynthDefinition(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, expected);
      
      code = [
        "Synth.def (out,freq=440,amp=[1,2])->",
        "  1000",
        ".play()"
      ].join("\n");
      expected = [
        "Synth.def((out,freq,amp)->",
        "  1000",
        ",['out','0','freq','440','amp','[1,2]']).play()"
      ].join("\n");
      tokens = coffee.tokens(code);
      tokens = compiler.replaceSynthDefinition(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, expected);

      code = [
        "Synth.def((a={},b='')->",
        "  1000",
        ", 1000).play()"
      ].join("\n");
      expected = [
        "Synth.def((a,b)->",
        "  1000",
        ",['a','{}','b','\"\"'],1000).play()"
      ].join("\n");
      tokens = coffee.tokens(code);
      tokens = compiler.replaceSynthDefinition(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, expected);
    });
    it("replaceGlobalVariants", function() {
      cc.global.Global = true;
      var tokens, actual;
      tokens = coffee.tokens("Global, NotGlobal");
      tokens = compiler.replaceGlobalVariants(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "cc.Global,NotGlobal");

      tokens = coffee.tokens("a.Global, @Global");
      tokens = compiler.replaceGlobalVariants(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "a.Global,@Global");

      tokens = coffee.tokens("{Global:Global}");
      tokens = compiler.replaceGlobalVariants(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "{Global:cc.Global}");

      tokens = coffee.tokens("$,$123,$isGlobal");
      tokens = compiler.replaceGlobalVariants(tokens);
      actual = detokens(tokens).trim();
      assert.equal(actual, "$,$123,global.isGlobal");
    });
    it("finalize", function() {
      var tokens, actual;
      tokens = coffee.tokens("100");
      tokens = compiler.finalize(tokens);
      actual = detokens(tokens).trim();
      assert.equal(
        actual, "" +
          "((global,undefined)->\n" +
          "  100\n" +
          ").call(cc.__context__,this.self||global)"
      );
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
