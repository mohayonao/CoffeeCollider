define(function(require, exports, module) {
  "use strict";

  var CoffeeScript = global.CoffeeScript || global.require("coffee-script");
  
  var cc = require("../cc");
  var numericstring = require("../common/numericstring");
  var push = [].push;
  
  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location

  // utility functions
  var isDot = function(token) {
    return !!token && (token[TAG] === "." || token[TAG] === "@");
  };
  var isColon = function(token) {
    return !!token && token[TAG] === ":";
  };
  var indexOfParamEnd = function(tokens, index) {
    var bracket = 0, i, imax = tokens.length;
    for (i = index; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "PARAM_START":
        bracket += 1;
        break;
      case "PARAM_END":
        bracket -= 1;
        if (bracket === 0) {
          return i;
        }
      }
    }
    return -1;
  };
  var indexOfFunctionStart = function(tokens, index) {
    var i, imax = tokens.length;
    for (i = index; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "PARAM_START": case "->": case "=>":
        return i;
      case "TERMINATOR":
      case "[": case "{": case "(":
      case "CALL_START": case "INDEX_START":
        return -1;
      }
    }
    return -1;
  };
  var formatArgument = function(op) {
    return op.tokens.slice(op.begin, op.end+1).map(function(token, index) {
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "'") {
        return "\"" + token[VALUE].substr(1, token[VALUE].length - 2) + "\"";
      } else if (token[TAG] === "IDENTIFIER" && op.tokens[op.begin+index+1][TAG] === ":") {
        return "\"" + token[VALUE] + "\"";
      }
      return token[VALUE];
    }).join("");
  };
  
  var detectPlusMinusOperator = function(tokens) {
    var i, prevTag = "", tag, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      tag = tokens[i][TAG];
      if (tag === "+" || tag === "-") {
        switch (prevTag) {
        case "IDENTIFIER": case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED": case "]": case "}": case ")":
        case "CALL_END": case "INDEX_END":
          tokens[i][TAG] = "MATH";
          break;
        default:
          tokens[i][TAG] = "UNARY";
        }
      }
      prevTag = tag;
    }
    tokens.cc_plusminus = true;
    return tokens;
  };
  
  var revertPlusMinusOperator = function(tokens) {
    var i, val, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      val = tokens[i][VALUE];
      if (val === "+" || val === "-") {
        tokens[i][TAG] = val;
      }
    }
    return tokens;
  };
  
  var getPrevOperand = function(tokens, index) {
    var bracket = 0;
    var indent  = 0;
    var end = index;
    var prev;
    while (1 < index) {
      switch (tokens[index][TAG]) {
      case "(": case "[": case "{":
      case "PARAM_START": case "CALL_START": case "INDEX_START":
        bracket -= 1;
        break;
      case "}": case "]": case ")":
      case "PARAM_END": case "CALL_END": case "INDEX_END":
        bracket += 1;
        break;
      case "OUTDENT":
        indent += 1;
        break;
      case "INDENT":
        indent -= 1;
        break;
      }
      switch (tokens[index - 1][TAG]) {
      case "PARAM_END": case "CALL_END": case "INDEX_END":
      case ".": case "@":
        index -= 1;
        continue;
      }
      switch (tokens[index][TAG]) {
      case "(": case "[": case "{": case "PARAM_START":
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "@": case "THIS": case "SUPER":
      case "->": case "=>":
        if (bracket === 0 && indent === 0) {
          while ((prev = tokens[index-1]) && prev[TAG] === "UNARY") {
            index -= 1;
          }
          return {tokens:tokens, begin:index, end:end};
        }
        break;
      }
      index -= 1;
    }
    return {tokens:tokens, begin:0, end:end};
  };
  
  var getNextOperand = function(tokens, index) {
    var bracket = 0;
    var indent  = 0;
    var begin = index;
    var imax = tokens.length - 2;
    var tag;

    if (tokens[index] && tokens[index][TAG] === "@") {
      if (tokens[index+1][TAG] !== "IDENTIFIER") {
        return {tokens:tokens, begin:index, end:index};
      }
    }
    
    while (index < imax) {
      tag = tokens[index][TAG];
      
      switch (tag) {
      case "(": case "[": case "{":
      case "PARAM_START":
        bracket += 1;
        break;
      case "}": case "]": case ")":
      case "PARAM_END": case "CALL_END": case "INDEX_END":
        bracket -= 1;
        break;
      case "INDENT":
        indent += 1;
        break;
      case "OUTDENT":
        indent -= 1;
        break;
      }
      
      switch (tokens[index + 1][TAG]) {
      case "CALL_START": case "INDEX_START":
        bracket += 1;
        index += 1;
        continue;
      case ".": case "@": case "ELSE":
        index += 1;
        continue;
      }
      
      switch (tag) {
      case "}": case "]": case ")": case "CALL_END": case "INDEX_END":
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "OUTDENT":
        if (bracket === 0 && indent === 0) {
          return {tokens:tokens, begin:begin, end:index};
        }
        break;
      }
      index += 1;
    }
    return {tokens:tokens, begin:begin, end:Math.max(0,tokens.length - 2)};
  };
  
  var func = {};
  var detectFunctionParameters = function(tokens) {
    var stack = [
      { declared:[], args:[], local:[], outer:[] }
    ];
    var scope;
    var indent = 0;
    var args = [];
    var vars = [];
    var op, token;
    var i, imax = tokens.length - 1;
    
    stack.setVariables = func.setVariables(stack);
    
    for (i = 0; i < imax; ++i) {
      token = tokens[i];
      stack.peek = stack[stack.length - 1];
      switch (token[TAG]) {
      case "PARAM_START":
        args = func.getInfoOfArguments(tokens, i);
        i    = args.end + 1;
        vars = args.vars;
        args = args.args;
        /* falls through */
      case "->": case "=>":
        scope = {
          declared: stack.peek.declared.concat(stack.peek.local).concat(stack.peek.args),
          args:vars.splice(0), local:[], outer:[], indent:indent
        };
        tokens[i].cc_funcParams = {
          args:args.splice(0), local:scope.local, outer:scope.outer
        };
        token.cc_funcRef = tokens[i];
        stack.push(scope);
        break;
      case "FOR":
        do {
          op = getNextOperand(tokens, i+1);
          func.getVariables(op).forEach(stack.setVariables);
          i = op.end + 1;
        } while (i < imax && tokens[i][TAG] === ",");
        break;
      case "INDENT":
        indent += 1;
        break;
      case "OUTDENT":
        indent -= 1;
        if (stack.peek.indent === indent) {
          stack.pop();
        }
        break;
      case "[":
        op = getNextOperand(tokens, i);
        func.getVariables(op).forEach(stack.setVariables);
        break;
      case "IDENTIFIER":
        if (tokens[i+1][TAG] === "CALL_START" || /^[A-Z]/.test(token[VALUE])) {
          break;
        }
        op = getNextOperand(tokens, i);
        if ((op.begin === op.end && tokens[op.end+1][TAG] !== ":") || tokens[op.begin+1][TAG] === ".") {
          func.getVariables(op).forEach(stack.setVariables);
        }
      }
    }
    tokens.cc_funcParams = {
      local: stack[0].local
    };
    return tokens;
  };

  func.setVariables = function(stack) {
    var ignored = [
      "cc", "global", "console", "setInterval", "setTimeout", "clearInterval", "clearTimeout"
    ];
    return function(name) {
      var i;
      if (ignored.indexOf(name) !== -1) {
        return;
      }
      if (stack.peek.declared.indexOf(name) === -1) {  // not declared yet
        if (stack.peek.args.indexOf(name) === -1) {    // not function parameters
          if (stack.peek.local.indexOf(name) === -1) { //   when a local variable (set)
            stack.peek.local.push(name);
          }
        }
        return;
      }
      
      // when not a local variable
      if (stack.peek.outer.indexOf(name) !== -1) {
        return;
      }
      
      // outer variable
      stack.peek.outer.push(name);
      for (i = stack.length - 2; i >= 0; i--) {
        if (stack[i].local.indexOf(name) !== -1) {
          return;
        }
        if (stack[i].outer.indexOf(name) === -1) {
          stack[i].outer.push(name);
        }
      }
    };
  };
  
  func.getInfoOfArguments = function(tokens, index) {
    var begin = index;
    var end   = indexOfParamEnd(tokens, index);
    var vars = [], args = [];
    var i, op;
    for (i = begin + 1; i < end; ++i) {
      op = getNextOperand(tokens, i);
      args.push(formatArgument(op));
      vars = func.getVariables(op, vars);
      i += op.end - op.begin + 1;
      if (tokens[i][TAG] === "=") {
        op = getNextOperand(tokens, i+1);
        args.push(formatArgument(op));
        i += op.end - op.begin + 1;
      } else {
        args.push(null);
      }
      if (tokens[i][TAG] !== ",") {
        i += 1;
      }
    }
    return {vars:vars, args:args, end:end};
  };
  func.getVariables = function(op, list) {
    var tokens = op.tokens, i, imax, _op;
    list = list || [];
    if (tokens[op.begin][TAG] === "[" && tokens[op.end][TAG] === "]") {
      imax = op.end;
      for (i = op.begin + 1; i < imax; ++i) {
        _op = getNextOperand(tokens, i);
        list = func.getVariables(_op, list);
        i += _op.end - _op.begin + 1;
        if (tokens[i][TAG] !== ",") {
          i += 1;
        }
      }
    } else {
      if (!isDot(tokens[op.begin-1])) {
        if (/^[a-z][a-zA-Z0-9_$]*$/.test(tokens[op.begin][VALUE])) {
          list.push(tokens[op.begin][VALUE]);
        }
      }
    }
    return list;
  };
  
  var replaceNumericString = function(tokens) {
    var token, str, val, i, imax = tokens.length;
    for (i = 0; i < imax; ++i) {
      token = tokens[i];
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "\"") {
        str = token[VALUE].substr(1, token[VALUE].length - 2);
        val = numericstring.timevalue(str);
        if (typeof val !== "number") {
          val = numericstring.notevalue(str);
        }
        if (typeof val === "number") {
          token[TAG] = "NUMBER";
          token[VALUE] = val.toString();
        }
      }
    }
    return tokens;
  };
  
  var replaceStrictlyPrecedence = function(tokens) {
    var i, token, prev, next;
    for (i = tokens.length - 1; i > 0; i--) {
      token = tokens[i];
      if (token[TAG] === "MATH" && (token[VALUE] !== "+" && token[VALUE] !== "-")) {
        prev = getPrevOperand(tokens, i);
        next = getNextOperand(tokens, i);
        tokens.splice(next.end + 1, 0, [")", ")" , _]);
        tokens.splice(prev.begin  , 0, ["(", "(" , _]);
      }
    }
    return tokens;
  };
  
  var replaceUnaryOperator = function(tokens) {
    var i, token, selector, next;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "UNARY") {
        continue;
      }
      switch (token[VALUE]) {
      case "+":
        selector = "__plus__";
        break;
      case "-":
        selector = "__minus__";
        break;
      default:
        continue;
      }
      next = getNextOperand(tokens, i);
      tokens.splice(
        next.end + 1, 0,
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _],
        ["CALL_END"  , ")"     , _]
      );
      tokens.splice(i, 1); // remove an origin operator
    }
    return tokens;
  };
  
  var replaceTextBinaryAdverb = function(code) {
    return code.replace(/([+\-*\/%])(W|S|C|F|T|X|WRAP|SHORT|CLIP|FOLD|TABLE|FLAT)\1/g, function(_, selector, adverb) {
      return selector + " \"#!" + adverb.charAt(0) + "\" " + selector;
    });
  };
  
  var replaceBinaryOperatorAdverbs = function(tokens) {
    var i, t0, t1, t2;
    for (i = tokens.length - 1; i >= 0; i--) {
      t0 = tokens[i];
      if (t0[TAG] !== "MATH") {
        continue;
      }
      t1 = tokens[i + 1];
      t2 = tokens[i + 2];
      if (t0[VALUE] === t2[VALUE] && /^"#![WSCFTX]"$/.test(t1[VALUE])) {
        t0.adverb = t1[VALUE].charAt(3);
        tokens.splice(i + 1, 2);
      }
    }
    return tokens;
  };
  
  var replaceBinaryOperator = function(tokens) {
    var i, token, selector, adverb, next;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "MATH") {
        continue;
      }
      switch (token[VALUE]) {
      case "+":
        selector = "__add__";
        break;
      case "-":
        selector = "__sub__";
        break;
      case "*":
        selector = "__mul__";
        break;
      case "/":
        selector = "__div__";
        break;
      case "%":
        selector = "__mod__";
        break;
      default:
        throw new Error("Unknown MATH:" + token[VALUE]);
      }
      adverb = token.adverb;
      next   = getNextOperand(tokens, i);
      tokens.splice(
        i, 1,
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _]
      );
      if (adverb) {
        adverb = {
          W: "WRAP",
          S: "SHORT",
          C: "CLIP",
          F: "FOLD",
          T: "TABLE",
          X: "FLAT"
        }[adverb];
        tokens.splice(
          next.end + 3, 0,
          [","         , ","   , _],
          ["IDENTIFIER", adverb, _],
          ["CALL_END"  , ")"   , _]
        );
      } else {
        tokens.splice(
          next.end + 3, 0,
          ["CALL_END", ")", _]
        );
      }
    }
    return tokens;
  };
  
  var replaceCompoundAssign = function(tokens) {
    var i, j, token, selector, prev, next, subtokens;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "COMPOUND_ASSIGN") {
        continue;
      }
      switch (token[VALUE]) {
      case "+=":
        selector = "__add__";
        break;
      case "-=":
        selector = "__sub__";
        break;
      case "*=":
        selector = "__mul__";
        break;
      case "/=":
        selector = "__div__";
        break;
      case "%=":
        selector = "__mod__";
        break;
      default:
        throw new Error("Unknown COMPOUND_ASSIGN:" + token[VALUE]);
      }
      prev = getPrevOperand(tokens, i);
      next = getNextOperand(tokens, i);

      tokens.splice(
        i, 1,
        ["="         , "="     , _],
        ["."         , "."     , _],
        ["IDENTIFIER", selector, _],
        ["CALL_START", "("     , _]
      );
      tokens.splice(
        next.end + 4, 0,
        ["CALL_END", ")", _]
      );
      subtokens = [ i + 1, 0 ];
      for (j = prev.begin; j < i; ++j) {
        subtokens.push(tokens[j]);
      }
      tokens.splice.apply(tokens, subtokens);
    }
    return tokens;
  };
  
  var synthdef = {}; // utility functions
  
  var replaceSynthDefinition = function(tokens) {
    var i, index, args;
    
    for (i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i][VALUE] !== "SynthDef") {
        continue;
      }
      if (isDot(tokens[i-1])) {
        continue;
      }
      index = i;
      while (index < tokens.length) {
        if (tokens[index][TAG] === "CALL_START") {
          break;
        }
        index += 1;
      }
      index = indexOfFunctionStart(tokens, index+1);
      if (index === -1) {
        continue;
      }
      args = tokens[index].cc_funcRef.cc_funcParams.args;
      if (args.length) {
        synthdef.replaceDefaultArguments(tokens, index, args);
      }
      index = getNextOperand(tokens, index).end + 1;
      synthdef.insertSynthDefArgumentsToAfterFunction(tokens, index, args);
    }
    return tokens;
  };
  synthdef.replaceDefaultArguments = function(tokens, index, args) {
    var i, removelen, spliceargs, imax = args.length;
    removelen  = indexOfParamEnd(tokens, index) - index + 1;
    spliceargs = [ index, removelen ];
    
    spliceargs.push(["PARAM_START", "(", _]);
    for (i = 0; i < imax; i += 2) {
      if (i) {
        spliceargs.push([",", ",", _]);
      }
      spliceargs.push(["IDENTIFIER", args[i], _]);
    }
    spliceargs.push(["PARAM_END"  , ")", _]);
    
    tokens.splice.apply(tokens, spliceargs);
  };
  synthdef.insertSynthDefArgumentsToAfterFunction = function(tokens, index, args) {
    var i, spliceargs, imax = args.length;
    spliceargs = [ index, 0 ];
    spliceargs.push([",", ",", _],
                    ["[", "[", _]);
    for (i = 0; i < imax; ++i) {
      if (i) {
        spliceargs.push([",", ",", _]);
      }
      spliceargs.push(["STRING", "'" + (args[i]||0) + "'", _]);
    }
    spliceargs.push(["]", "]", _]);
    
    tokens.splice.apply(tokens, spliceargs);
  };
  
  var segmented = {}; // utility functions
  
  var replaceSyncBlock = function(tokens) {
    var i, token, index, isSyncBlock;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (tokens[i+1][TAG] !== "CALL_START") {
        continue;
      }
      switch (token[VALUE]) {
      case "Task":
        isSyncBlock = false;
        break;
      case "syncblock":
        isSyncBlock = true;
        break;
      default:
        continue;
      }
      index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      segmented.makeSyncBlock(getNextOperand(tokens, index), isSyncBlock);
    }
    return tokens;
  };
  
  segmented.makeSyncBlock = function(op, syncblock) {
    var tokens = op.tokens;
    var body   = tokens.splice(op.begin, op.end-op.begin+1);
    var after  = tokens.splice(op.begin);
    var localVars, outerVars, args;
    
    var ref = body[0].cc_funcRef;
    localVars = ref.cc_funcParams.local;
    outerVars = ref.cc_funcParams.outer;
    args = ref.cc_funcParams.args.filter(function(name, i) {
      return !(i & 1);
    }).map(function(x) {
      var tokens = CoffeeScript.tokens(x);
      tokens.pop(); // remove TERMINATOR
      return tokens;
    });

    if (args.length) {
      // remove default args
      body.splice(0, indexOfParamEnd(body, 0) + 1);
    }
    body.splice(0, 2); // remove ->, INDENT
    body.pop();        // remove OUTDENT
    
    var replaced = segmented.createSyncBlock(body, args, localVars, syncblock);
    
    for (var i = replaced.length; i--; ) {
      replaced[i].cc_segmented = true;
    }
    push.apply(tokens, replaced);
    push.apply(tokens, after);
    
    return op;
  };
  
  segmented.createSyncBlock = function(body, args, localVars, syncblock) {
    var tokens = [];
    if (!syncblock) {
      tokens.push(["IDENTIFIER", "syncblock", _],
                  ["CALL_START", "("        , _]);
    }
    tokens.push(["->"        , "->"       , _],
                ["INDENT"    , 2          , _]);
    {
      segmented.insertLocalVariables(tokens, localVars);
      tokens.push(["["      , "[" , _],
                  ["INDENT" , 2   , _]);
      var numSegments = 0;
      while (body.length) {
        if (numSegments++) {
          tokens.push(["TERMINATOR", "\n", _]);
        }
        segmented.beginOfSegment(tokens, args);
        segmented.insertSegment(tokens, body);
        segmented.endOfSegment(tokens, args);
      }
      tokens.push(["OUTDENT", 2  , _],
                  ["]"      , "]", _]);
    }
    tokens.push(["OUTDENT" , 2  , _]);
    if (!syncblock) {
      tokens.push(["CALL_END", ")", _]);
    }
    return tokens;
  };
  segmented.insertLocalVariables = function(tokens, localVars) {
    if (localVars && localVars.length) {
      for (var i = 0, imax = localVars.length; i < imax; i++) {
        tokens.push(["IDENTIFIER", localVars[i], _],
                    ["="         , "="         , _]);
      }
      tokens.push(["UNDEFINED" , "undefined", _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  segmented.beginOfSegment = function(tokens, args) {
    if (args && args.length) {
      tokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        push.apply(tokens, args[i]);
      }
      tokens.push(["PARAM_END"  , ")", _]);
    }
    tokens.push(["->"    , "->", _],
                ["INDENT", 2   , _]);
  };
  segmented.splitIdentifiers = [ "Task", "syncblock", "wait" ];
  segmented.insertSegment = function(tokens, body) {
    while (body.length) {
      var line = segmented.fetchLine(body);
      push.apply(tokens, line);
      for (var i = 0, imax = line.length; i < imax; ++i) {
        var t = line[i];
        if (t[TAG] === "IDENTIFIER" && segmented.splitIdentifiers.indexOf(t[VALUE]) !== -1) {
          return;
        }
      }
    }
  };
  segmented.endOfSegment = function(tokens) {
    tokens.push(["OUTDENT", 2, _]);
  };
  segmented.fetchLine = function(tokens) {
    var depth = 0;
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      switch (tokens[i][TAG]) {
      case "(": case "{": case "[":
      case "CALL_START": case "PARAM_START": case "INDEX_START":
        depth += 1;
        break;
      case "]": case "}": case ")":
      case "CALL_END": case "PARAM_END": case "INDEX_END":
        depth -= 1;
        break;
      case "TERMINATOR":
        if (depth === 0) {
          return tokens.splice(0, i + 1);
        }
        break;
      case "INDENT":
        depth += 1;
        break;
      case "OUTDENT":
        if (depth === 0) {
          return tokens.splice(0, i);
        }
        depth -= 1;
        break;
      }
    }
    return tokens.splice(0);
  };
  
  var replaceGlobalVariables = function(tokens) {
    var i, token;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (!/^\$[a-z][a-zA-Z0-9_]*$/.test(token[VALUE])) {
        continue;
      }
      if (isColon(tokens[i+1])) {
        continue; // { NotGlobal:"dict key is not global" }
      }
      if (isDot(tokens[i-1])) {
        continue; // this.is.NotGlobal, @isNotGlobal
      }
      tokens.splice(
        i, 1,
        ["IDENTIFIER", "global", _],
        ["."         , "."     , _],
        ["IDENTIFIER", token[VALUE].substr(1), _]
      );
    }
    return tokens;
  };
  
  var replaceCCVariables = function(tokens) {
    var i, token;
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (!cc.global.hasOwnProperty(token[VALUE])) {
        continue;
      }
      if (isColon(tokens[i+1])) {
        continue;
      }
      if (isDot(tokens[i-1])) {
        continue;
      }
      tokens.splice(
        i, 0,
        ["IDENTIFIER", "cc", _],
        ["."         , "." , _]
      );
    }
    return tokens;
  };
  
  var wrapWholeCode = function(tokens) {
    tokens.unshift(["("          , "("       , _],
                   ["PARAM_START", "("       , _],
                   ["IDENTIFIER" , "global"  , _],
                   [","         , ","        , _],
                   ["IDENTIFIER", "cc"       , _],
                   ["PARAM_END"  , ")"       , _],
                   ["->"         , "->"      , _],
                   ["INDENT"     , 2         , _]);
    tokens.push(["OUTDENT"   , 2            , _],
                [")"         , ")"          , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "call"       , _],
                ["CALL_START", "("          , _],
                ["IDENTIFIER", "cc"         , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "__context__", _],
                [","         , ","          , _],
                ["THIS"      , "this"       , _],
                ["."         , "."          , _],
                ["IDENTIFIER", "self"       , _],
                ["LOGIC"     , "||"         , _],
                ["IDENTIFIER", "global"     , _],
                [","         , ","          , _],
                ["IDENTIFIER", "cc"         , _],
                ["CALL_END"  , ")"          , _]);
    return tokens;
  };

  var getConditionedTokens = function(code) {
    var tokens;
    code = replaceTextBinaryAdverb(code);
    tokens = CoffeeScript.tokens(code);
    if (tokens.length) {
      tokens = replaceNumericString(tokens);
      tokens = detectFunctionParameters(tokens);
      tokens = detectPlusMinusOperator(tokens);
      tokens = replaceBinaryOperatorAdverbs(tokens);
    }
    return tokens;
  };
  
  var CoffeeCompiler = (function() {
    function CoffeeCompiler() {
    }
    CoffeeCompiler.prototype.tokens = function(code) {
      var tokens = getConditionedTokens(code);
      if (tokens.length) {
        tokens = replaceGlobalVariables(tokens);
        tokens = replaceStrictlyPrecedence(tokens);
        tokens = replaceUnaryOperator(tokens);
        tokens = replaceBinaryOperator(tokens);
        tokens = replaceCompoundAssign(tokens);
        tokens = replaceSynthDefinition(tokens);
        tokens = replaceSyncBlock(tokens);
        tokens = replaceCCVariables(tokens);
        tokens = wrapWholeCode(tokens);
      }
      return tokens;
    };
    CoffeeCompiler.prototype.compile = function(code) {
      return CoffeeScript.nodes(this.tokens(code)).compile({bare:true}).trim();
    };
    return CoffeeCompiler;
  })();
  
  cc.createCompiler = function() {
    return new CoffeeCompiler();
  };
  
  module.exports = {
    CoffeeCompiler: CoffeeCompiler,
    
    // private methods
    indexOfParamEnd     : indexOfParamEnd,
    indexOfFunctionStart: indexOfFunctionStart,
    formatArgument      : formatArgument,
    getPrevOperand          : getPrevOperand,
    getNextOperand          : getNextOperand,
    detectPlusMinusOperator : detectPlusMinusOperator,
    revertPlusMinusOperator : revertPlusMinusOperator,
    detectFunctionParameters: detectFunctionParameters,
    
    replaceTextBinaryAdverb     : replaceTextBinaryAdverb,
    replaceBinaryOperatorAdverbs: replaceBinaryOperatorAdverbs,
    replaceNumericString     : replaceNumericString,
    replaceStrictlyPrecedence: replaceStrictlyPrecedence,
    replaceUnaryOperator     : replaceUnaryOperator,
    replaceBinaryOperator    : replaceBinaryOperator,
    replaceCompoundAssign    : replaceCompoundAssign,
    replaceSynthDefinition   : replaceSynthDefinition,
    replaceSyncBlock         : replaceSyncBlock,
    replaceGlobalVariables   : replaceGlobalVariables,
    replaceCCVariables       : replaceCCVariables,
    wrapWholeCode            : wrapWholeCode
  };

});
