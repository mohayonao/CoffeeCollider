define(function(require, exports, module) {
  "use strict";

  var CoffeeScript = global.CoffeeScript || global.require("coffee-script");
  
  var cc = require("../../cc");
  var timevalue = require("../../common/timevalue").calc;
  
  // CoffeeScript tags
  // IDENTIFIER
  // NUMBER
  // STRING
  // REGEX
  // BOOL
  // NULL
  // UNDEFINED
  // COMPOUND_ASSIGN -=, +=, div=, *=, %=, ||=, &&=, ?=, <<=, >>=, >>>=, &=, ^=, |=
  // UNARY           !, ~, new, typeof, delete, do
  // LOGIC           &&, ||, &, |, ^
  // SHIFT           <<, >>, >>>
  // COMPARE         ==, !=, <, >, <=, >=
  // MATH            *, div, %, 
  // RELATION        in, of, instanceof
  // =
  // +
  // -
  // ..
  // ...
  // ++
  // --
  // (
  // )
  // [
  // ]
  // {
  // }
  // ?
  // ::
  // @
  // IF
  // ELSE
  // WHILE
  // LOOP
  // SWITCH
  // LEADING_WHEN
  // THIS
  // SUPER
  // INDENT
  // OUTDENT
  // RETURN
  // TERMINATOR
  // HERECOMMENT

  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location

  // utility functions
  var isDot = function(token) {
    return !!token && (token[TAG] === "." || token[TAG] === "@");
  };
  
  var getIdentifier = function(token) {
    var val = token[VALUE];
    if (val.reserved) {
      return val[0] + val[1] + (val[2]||"") + (val[3]||"") + (val[4]||"") +
        (val[5]||"") + (val[6]||"") + (val[7]||"");
    }
    return val;
  };
  
  var getLine = function(tokens, index) {
    var depth = 0;
    var result = { tokens:tokens, begin:index, end:-1, len:0, isLastLine:false };
    for (var i = index, imax = tokens.length; i < imax; ++i) {
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
          result.end = i;
        }
        break;
      case "INDENT":
        depth += 1;
        break;
      case "OUTDENT":
        depth -= 1;
        if (depth === -1) {
          result.end = i - 1;
          result.isLastLine = true;
        }
        break;
      }
      if (result.end !== -1) {
        break;
      }
    }
    if (result.end === -1) {
      result.end = tokens.length - 1;
    }
    result.len = result.end - result.begin + 1;
    return result;
  };
  var indexOfParamEnd = function(tokens, index) {
    var bracket = 0;
    for (var i = index, imax = tokens.length; i < imax; ++i) {
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
    for (var i = index, imax = tokens.length; i < imax; ++i) {
      if (tokens[i][TAG] === "TERMINATOR" || tokens[i][TAG] === ".") {
        break;
      }
      if (tokens[i][TAG] === "->" ||
          tokens[i][TAG] === "=>" ||
          tokens[i][TAG] === "PARAM_START") {
        return i;
      }
    }
    return -1;
  };
  var formatArgument = function(op) {
    return op.tokens.slice(op.begin, op.end+1).map(function(token, index) {
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "'") {
        return "\"" + token[VALUE].substr(1, token[VALUE].length-2) + "\"";
      } else if (token[TAG] === "IDENTIFIER" && op.tokens[op.begin+index+1][TAG] === ":") {
        return "\"" + token[VALUE] + "\"";
      }
      return token[VALUE];
    }).join("");
  };
  
  
  
  
  var detectPlusMinusOperator = function(tokens) {
    if (tokens.cc_plusminus) {
      return tokens;
    }
    var prevTag = "";
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      var tag = tokens[i][TAG];
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
    if (!tokens.cc_plusminus) {
      for (var i = 0, imax = tokens.length; i < imax; ++i) {
        var val = tokens[i][VALUE];
        if (val === "+" || val === "-") {
          tokens[i][TAG] = val;
        }
      }
      return tokens;
    }
    delete tokens.cc_plusminus;
    return tokens;
  };
  
  var getPrevOperand = function(tokens, index) {
    tokens = detectPlusMinusOperator(tokens);
    
    var bracket = 0;
    var indent  = 0;
    var end = index;
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
          var prev;
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
    tokens = detectPlusMinusOperator(tokens);
    var bracket = 0;
    var indent  = 0;
    var begin = index;
    var imax = tokens.length - 2;

    if (tokens[index] && tokens[index][TAG] === "@") {
      if (tokens[index+1][TAG] !== "IDENTIFIER") {
        return {tokens:tokens, begin:index, end:index};
      }
    }
    
    while (index < imax) {
      var tag = tokens[index][TAG];
      
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
    return {tokens:tokens, begin:begin, end:Math.max(0,tokens.length-2)};
  };
  
  var func = {};
  var detectFunctionParameters = function(tokens) {
    if (tokens.cc_funcParams) {
      return tokens;
    }
    var stack = [
      { declared:[], args:[], local:[], outer:[] }
    ];
    stack.setVariables = func.setVariables(stack);
    
    var indent = 0;
    var args = [];
    var vars = [];
    for (var i = 0, imax = tokens.length - 1; i < imax; ++i) {
      var op, token = tokens[i];
      stack.peek = stack[stack.length-1];
      switch (token[TAG]) {
      case "PARAM_START":
        args = func.getInfoOfArguments(tokens, i);
        i    = args.end + 1;
        vars = args.vars;
        args = args.args;
        /* falls through */
      case "->": case "=>":
        var scope = {
          declared: stack.peek.declared.concat(stack.peek.local),
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
      "cc", "global", "console",
      "setInterval", "setTimeout", "clearInterval", "clearTimeout"
    ];
    return function(name) {
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
      for (var i = stack.length - 2; i >= 0; i--) {
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
    var end  = indexOfParamEnd(tokens, index);
    var vars = [];
    var args = [];
    for (var i = begin+1; i < end; ++i) {
      var op = getNextOperand(tokens, i);
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
    var tokens = op.tokens;
    list = list || [];
    if (tokens[op.begin][TAG] === "[" && tokens[op.end][TAG] === "]") {
      for (var i = op.begin+1, imax = op.end; i < imax; ++i) {
        var _op = getNextOperand(tokens, i);
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
  
  
  var replaceFixedTimeValue = function(tokens) {
    for (var i = 0, imax = tokens.length; i < imax; ++i) {
      var token = tokens[i];
      if (token[TAG] === "STRING" && token[VALUE].charAt(0) === "\"") {
        var time = timevalue(token[VALUE].substr(1, token[VALUE].length-2));
        if (typeof time === "number") {
          token[TAG] = "NUMBER";
          token[VALUE] = time.toString();
        }
      }
    }
    return tokens;
  };
  
  var replaceStrictlyPrecedence = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i > 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "MATH" && (token[VALUE] !== "+" && token[VALUE] !== "-")) {
        var prev = getPrevOperand(tokens, i);
        var next = getNextOperand(tokens, i);
        tokens.splice(next.end + 1, 0, [")", ")" , _]);
        tokens.splice(prev.begin  , 0, ["(", "(" , _]);
      }
    }
    return tokens;
  };

  var uop = {
    operatorDict: {
      "+": "__plus__", "-": "__minus__"
    }
  };
  var replaceUnaryOperator = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "UNARY" && uop.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = uop.operatorDict[token[VALUE]];
        var next = getNextOperand(tokens, i);
        tokens.splice(
          next.end+1, 0,
          ["."         , "."     , _],
          ["IDENTIFIER", selector, _],
          ["CALL_START", "("     , _],
          ["CALL_END"  , ")"     , _]
        );
        tokens.splice(i, 1);
      }
    }
    return tokens;
  };
  
  var bop = {
    operatorDict: {
      "+": "__add__", "-": "__sub__", "*": "__mul__", "/": "__div__", "%": "__mod__"
    },
    adverbs: {
      W:"WRAP", S:"SHORT", C:"CLIP", F:"FOLD", T:"TABLE", X:"FLAT",
      WRAP:"WRAP", SHORT:"SHORT", CLIP:"CLIP", FOLD:"FOLD", TABLE:"TABLE", FLAT:"FLAT"
    }
  };
  var replaceTextBinaryAdverb = function(code) {
    Object.keys(bop.adverbs).forEach(function(key) {
      var a = new RegExp("([+\\-*/%])(" + key + ")\\1", "g");
      var b = "$1 " + "\"#!" + key.charAt(0) + "\"" + " $1";
      code = code.replace(a, b);
    });
    return code;
  };
  var replaceBinaryOperator = function(tokens) {
    tokens = detectPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "MATH" && bop.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = bop.operatorDict[token[VALUE]];
        var adverb   = bop.checkAdvarb(tokens, i);
        var next = getNextOperand(tokens, i);
        if (adverb) {
          i -= 2;
          tokens.splice(
            i, 3,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end+1, 0,
            [","         , ","   , _],
            ["IDENTIFIER", adverb, _],
            ["CALL_END"  , ")"   , _]
          );
        } else {
          tokens.splice(
            i, 1,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end+3, 0,
            ["CALL_END", ")", _]
          );
        }
      }
    }
    return tokens;
  };
  bop.checkAdvarb = function(tokens, index) {
    var t0 = tokens[index  ];
    var t1 = tokens[index-1];
    var t2 = tokens[index-2];
    if (t0 && t1 && t2) {
      if (/^"#![WSCFTX]"$/.test(t1[VALUE])) {
        var key = t1[VALUE].charAt(3);
        if (t0[VALUE] === t2[VALUE] && bop.adverbs.hasOwnProperty(key)) {
          return bop.adverbs[key];
        }
      }
    }
  };
  
  
  var compound = {
    operatorDict: {
      "+=": "__add__",
      "-=": "__sub__",
      "*=": "__mul__",
      "/=": "__div__",
      "%=": "__mod__",
    }
  };
  var replaceCompoundAssign = function(tokens) {
    for (var i = tokens.length; --i > 0; ) {
      var token = tokens[i];
      if (compound.operatorDict.hasOwnProperty(token[VALUE])) {
        var selector = compound.operatorDict[token[VALUE]];
        var prev = getPrevOperand(tokens, i);
        var next = getNextOperand(tokens, i);

        tokens.splice(
          i, 1,
          ["="         , "="     , _],
          ["."         , "."     , _],
          ["IDENTIFIER", selector, _],
          ["CALL_START", "("     , _]
        );
        tokens.splice(
          next.end+4, 0,
          ["CALL_END", ")", _]
        );
        var subtokens = [ i+1, 0 ];
        for (var j = prev.begin; j < i; ++j) {
          subtokens.push(tokens[j]);
        }
        tokens.splice.apply(tokens, subtokens);
      }
    }
    return tokens;
  };

  var logic = {
    operatorDict: {
      "&&": "__and__", "||": "__or__"
    }
  };
  var replaceLogicOperator = function(tokens) {
    var replaceable = false;
    for (var i = 1; i < tokens.length; ++i) {
      var token = tokens[i];
      if (token[VALUE] === "wait" && tokens[i-1][TAG] === "@") {
        replaceable = true;
        continue;
      }
      if (token[TAG] === ",") {
        replaceable = false;
        continue;
      }
      if (replaceable) {
        if (token[TAG] === "LOGIC" && logic.operatorDict.hasOwnProperty(token[VALUE])) {
          var selector = logic.operatorDict[token[VALUE]];
          var next = getNextOperand(tokens, i);
          tokens.splice(
            i, 1,
            ["."         , "."     , _],
            ["IDENTIFIER", selector, _],
            ["CALL_START", "("     , _]
          );
          tokens.splice(
            next.end + 3, 0,
            ["CALL_END", ")", _]
          );
          i = next.end+3; // skip
        }
      }
    }
    return tokens;
  };
  
  
  var synthdef = {};
  var replaceSynthDefinition = function(tokens) {
    tokens = detectFunctionParameters(tokens);
    for (var i = tokens.length - 4; i--; ) {
      if ((i && tokens[i-1][TAG] === ".") || tokens[i][VALUE] !== "SynthDef") {
        continue;
      }
      var index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      var args;
      if (tokens[index].cc_funcRef) {
        args = tokens[index].cc_funcRef.cc_funcParams.args;
      } else {
        args = [];
      }
      synthdef.replaceSynthDefDefaultArguments(tokens, index, args);
      
      index = getNextOperand(tokens, index).end + 1;
      synthdef.insertSynthDefArgumentsToAfterFunction(tokens, index, args);
    }
    return tokens;
  };
  synthdef.replaceSynthDefDefaultArguments = function(tokens, index, args) {
    if (args.length) {
      var remove = indexOfParamEnd(tokens, index) - index + 1;
      var subtokens = [ index, remove ];
      
      subtokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; i += 2) {
        if (i) {
          subtokens.push([",", ",", _]);
        }
        subtokens.push(["IDENTIFIER", args[i], _]);
      }
      subtokens.push(["PARAM_END"  , ")", _]);
      
      tokens.splice.apply(tokens, subtokens);
    }
  };
  synthdef.insertSynthDefArgumentsToAfterFunction = function(tokens, index, args) {
    var subtokens = [ index, 0 ];
    
    subtokens.push([",", ",", _],
                   ["[", "[", _]);
    for (var j = 0, jmax = args.length; j < jmax; ++j) {
      if (j) {
        subtokens.push([",", ",", _]);
      }
      subtokens.push(["STRING", "'" + (args[j]||0) + "'", _]);
    }
    subtokens.push(["]", "]", _]);
    
    tokens.splice.apply(tokens, subtokens);
  };
  

  var task = {
    contextMethods: ["wait", "break", "continue", "redo", "recursive", "return"]
  };
  var replaceTaskFunction = function(tokens) {
    tokens = detectFunctionParameters(tokens);
    for (var i = tokens.length - 4; i--; ) {
      if ((i && tokens[i-1][TAG] === ".") || tokens[i][VALUE] !== "Task") {
        continue;
      }
      var index = indexOfFunctionStart(tokens, i + 2);
      if (index === -1) {
        continue;
      }
      task.makeSegmentedFunction(getNextOperand(tokens, index), task.contextMethods);
    }
    return tokens;
  };
  
  task.makeSegmentedFunction = function(op, contextMethods) {
    var tokens = op.tokens;
    var body   = tokens.splice(op.begin, op.end-op.begin+1);
    var after  = tokens.splice(op.begin);
    var localVars, outerVars, args;
    
    var ref = body[0].cc_funcRef;
    
    if (ref) {
      localVars = ref.cc_funcParams.local;
      outerVars = ref.cc_funcParams.outer;
      args = ref.cc_funcParams.args.filter(function(name, i) {
        return !(i & 1);
      });
    } else {
      localVars = outerVars = args = [];
    }
    
    if (args.length) {
      // remove default args
      body.splice(0, indexOfParamEnd(body, 0) + 1);
    }
    body.splice(0, 2); // remove ->, INDENT
    body.pop();        // remove OUTDENT
    
    var replaced = [];
    task.beginOfSegmentedFunction(replaced, outerVars);
    {
      task.insertLocalVariables(replaced, localVars);
      replaced.push(["["      , "[" , _],
                    ["INDENT" , 2   , _]);
      var numOfSegments = 0;
      while (body.length) {
        if (numOfSegments++) {
          replaced.push(["TERMINATOR", "\n", _]);
        }
        task.beginOfSegment(replaced, args);
        task.insertSegment(replaced, body, contextMethods);
        task.endOfSegment(replaced, args);
      }
      replaced.push(["OUTDENT", 2  , _],
                    ["]"      , "]", _]);
    }
    task.endOfSegmentedFunction(replaced, outerVars);

    for (var i = replaced.length; i--; ) {
      replaced[i].cc_tasked = true;
    }
    tokens.push.apply(tokens, replaced);
    tokens.push.apply(tokens, after);
  };
  
  task.beginOfSegmentedFunction = function(tokens, outerVars) {
    if (outerVars.length) {
      tokens.push(["UNARY"      , "do", _],
                  ["PARAM_START", "(" , _]);
      for (var i = 0, imax = outerVars.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", outerVars[i], _]);
      }
      tokens.push(["PARAM_END"  , ")" , _],
                  ["->"         , "->", _],
                  ["INDENT"     , 2   , _]);
    }
    tokens.push(["->"     , "->", _],
                ["INDENT" , 2   , _]);
  };
  
  task.endOfSegmentedFunction = function(tokens, outerVars) {
    tokens.push(["OUTDENT", 2  , _]);
    if (outerVars.length) {
      tokens.push(["OUTDENT", 2  , _]);
    }
  };
  
  task.insertLocalVariables = function(tokens, localVars) {
    if (localVars.length) {
      for (var i = 0, imax = localVars.length; i < imax; i++) {
        tokens.push(["IDENTIFIER", localVars[i], _],
                    ["="         , "="         , _]);
      }
      tokens.push(["UNDEFINED" , "undefined", _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  
  task.beginOfSegment = function(tokens, args) {
    if (args.length) {
      tokens.push(["PARAM_START", "(", _]);
      for (var i = 0, imax = args.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", args[i], _]);
      }
      tokens.push(["PARAM_END"  , ")", _]);
    }
    tokens.push(["->"    , "->", _],
                ["INDENT", 2   , _]);
  };
  
  task.endOfSegment = function(tokens) {
    tokens.push(["OUTDENT", 2, _]);
  };
  
  task.insertSegment = function(tokens, body, contextMethods) {
    var contextMethodCalled = false;
    
    while (!contextMethodCalled && body.length) {
      var line = getLine(body, 0);
      var closureVars = task.getClosureVariables(line);
      
      task.beginOfLine(tokens, line, closureVars);
      for (var i = line.len; i--; ) {
        if (!body[0].cc_tasked && body[0][TAG] === "@" && body[1]) {
          if (contextMethods.indexOf(getIdentifier(body[1])) !== -1) {
            contextMethodCalled = true;
          }
        }
        tokens.push(body.shift());
      }
      task.endOfLine(tokens, line, closureVars);
    }
  };
  
  task.getClosureVariables = function(line) {
    var tokens = line.tokens;
    var list = [];
    for (var i = 0, imax = line.len; i < imax; ++i) {
      if (!tokens[i].cc_tasked && (tokens[i][TAG] === "->" || tokens[i][TAG] === "=>")) {
        list.push.apply(list, tokens[i].cc_funcParams.outer);
      }
    }
    var set = {};
    return list.filter(function(name) {
      return set[name] ? false : !!(set[name] = true);
    });
  };
  
  task.beginOfLine = function(tokens, line, closureVars) {
    var i, imax;
    if (closureVars.length) {
      task.insertAssignment(tokens, line);
      tokens.push(["UNARY" , "do", _],
                  ["PARAM_START", "(", _]);
      for (i = 0, imax = closureVars.length; i < imax; ++i) {
        if (i) {
          tokens.push([",", ",", _]);
        }
        tokens.push(["IDENTIFIER", closureVars[i], _]);
      }
      tokens.push(["PARAM_END", ")" , _],
                  ["->"       , "->", _],
                  ["INDENT"   , 2   , _]);
    }
  };
  
  task.endOfLine = function(tokens, line, closureVars) {
    if (closureVars.length) {
      tokens.push(["OUTDENT"   , 2   , _],
                  ["TERMINATOR", "\n", _]);
    }
  };
  
  // TODO: fix it ( destructuring assginment? )
  task.insertAssignment = function(tokens, line) {
    var list = [];
    var line_tokens = line.tokens;
    if (line_tokens[0][TAG] === "IDENTIFIER") {
      var op = getNextOperand(line_tokens, 0);
      if (line_tokens[op.end+1] && line_tokens[op.end+1][TAG] === "=") {
        list = line_tokens.slice(0, op.end + 2);
      }
    }
    tokens.push.apply(tokens, list);
  };
  
  
  var replaceGlobalVariables = function(tokens) {
    for (var i = tokens.length - 1; i--; ) {
      var token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (/^\$[a-z][a-zA-Z0-9_]*$/.test(token[VALUE])) {
        if (tokens[i+1][TAG] === ":") {
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
    }
    return tokens;
  };
  
  var replaceCCVariables = function(tokens) {
    for (var i = tokens.length - 1; i--; ) {
      var token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (cc.global.hasOwnProperty(token[VALUE])) {
        if (tokens[i+1][TAG] === ":") {
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
    }
    return tokens;
  };
  
  var finalize = function(tokens) {
    tokens.unshift(["("          , "("        , _],
                   ["PARAM_START", "("        , _],
                   ["IDENTIFIER" , "global"   , _],
                   ["PARAM_END"  , ")"        , _],
                   ["->"         , "->"       , _],
                   ["INDENT"     , 2          , _]);
    
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
                ["CALL_END"  , ")"          , _]);
    return tokens;
  };
  
  var tab = function(n) {
    var t = "";
    for (var i = 0; i < n; ++i) {
      t += "  ";
    }
    return t;
  };
  var prettyPrint = function(tokens) {
    var indent = 0;
    tokens = detectPlusMinusOperator(tokens);
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
      case ",": case "RELATION": case "IF": case "SWITCH": case "LEADING_WHEN":
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
  
  var CoffeeCompiler = (function() {
    function CoffeeCompiler() {
    }
    CoffeeCompiler.prototype.tokens = function(code) {
      var data = [];
      code = replaceTextBinaryAdverb(code);
      var tokens = CoffeeScript.tokens(code);
      if (tokens.length) {
        tokens.forEach(function(token) {
          if (token[TAG] === "HERECOMMENT") {
            data.push(token[VALUE].trim());
          }
        });
        tokens = replaceGlobalVariables(tokens);
        tokens = replaceFixedTimeValue(tokens);
        tokens = replaceStrictlyPrecedence(tokens);
        tokens = replaceUnaryOperator(tokens);
        tokens = replaceBinaryOperator(tokens);
        tokens = replaceCompoundAssign(tokens);
        tokens = replaceLogicOperator(tokens);
        tokens = replaceSynthDefinition(tokens);
        tokens = replaceTaskFunction(tokens);
        tokens = replaceCCVariables(tokens);
        tokens = finalize(tokens);
      }
      this.code = code;
      this.data = data;
      return tokens;
    };
    CoffeeCompiler.prototype.compile = function(code) {
      var tokens = this.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    CoffeeCompiler.prototype.toString = function(tokens) {
      if (typeof tokens === "string") {
        tokens = this.tokens(tokens);
      }
      return prettyPrint(tokens);
    };
    return CoffeeCompiler;
  })();
  
  var use = function() {
    cc.createCoffeeCompiler = function() {
      return new CoffeeCompiler();
    };
  };
  
  module.exports = {
    CoffeeCompiler: CoffeeCompiler,
    
    detectPlusMinusOperator : detectPlusMinusOperator,
    revertPlusMinusOperator : revertPlusMinusOperator,
    getPrevOperand          : getPrevOperand,
    getNextOperand          : getNextOperand,
    detectFunctionParameters: detectFunctionParameters,

    replaceTextBinaryAdverb  : replaceTextBinaryAdverb,
    replaceFixedTimeValue    : replaceFixedTimeValue,
    replaceStrictlyPrecedence: replaceStrictlyPrecedence,
    replaceUnaryOperator     : replaceUnaryOperator,
    replaceBinaryOperator    : replaceBinaryOperator,
    replaceCompoundAssign    : replaceCompoundAssign,
    replaceLogicOperator     : replaceLogicOperator,
    replaceSynthDefinition   : replaceSynthDefinition,
    replaceTaskFunction      : replaceTaskFunction,
    replaceGlobalVariables   : replaceGlobalVariables,
    replaceCCVariables       : replaceCCVariables,
    finalize                 : finalize,
    prettyPrint              : prettyPrint,
    
    use: use,
  };

  module.exports.use();

});
