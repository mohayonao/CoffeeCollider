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

  var sortPlusMinusOperator = function(tokens) {
    if (tokens._sorted) {
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
    tokens._sorted = true;
    return tokens;
  };
  
  var revertPlusMinusOperator = function(tokens) {
    if (!tokens._sorted) {
      for (var i = 0, imax = tokens.length; i < imax; ++i) {
        var val = tokens[i][VALUE];
        if (val === "+" || val === "-") {
          tokens[i][TAG] = val;
        }
      }
      return tokens;
    }
    delete tokens._sorted;
    return tokens;
  };
  
  var getPrevOperand = function(tokens, index) {
    tokens = sortPlusMinusOperator(tokens);
    
    var bracket = 0;
    var indent  = 0;
    var end = index;
    while (1 < index) {
      switch (tokens[index - 1][TAG]) {
      case "PARAM_END": case "CALL_END": case "INDEX_END":
        bracket += 1;
        /* falls through */
      case ".": case "@":
        index -= 1;
        continue;
      }
      switch (tokens[index][TAG]) {
      case "(": case "[": case "{": case "PARAM_START":
        bracket -= 1;
        /* falls through */
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "@": case "THIS": case "SUPER":
      case "->":
        if (bracket === 0 && indent === 0) {
          var prev;
          while ((prev = tokens[index-1]) && prev[TAG] === "UNARY") {
            index -= 1;
          }
          return {tokens:tokens, begin:index, end:end};
        }
        break;
      case "CALL_START": case "INDEX_START":
        bracket -= 1;
        break;
      case "}": case "]": case ")":
        bracket += 1;
        break;
      case "OUTDENT":
        indent += 1;
        break;
      case "INDENT":
        indent -= 1;
        break;
      }
      index -= 1;
    }
    return {tokens:tokens, begin:0, end:end};
  };
  
  var getNextOperand = function(tokens, index) {
    tokens = sortPlusMinusOperator(tokens);
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
      case "(": case "[": case "{": case "PARAM_START":
        bracket += 1;
        break;
      case "}": case "]": case ")": case "CALL_END": case "INDEX_END":
        bracket -= 1;
        break;
      }
      
      switch (tokens[index + 1][TAG]) {
      case "CALL_START": case "INDEX_START":
        bracket += 1;
        index += 1;
        continue;
      case ".": case "@":
        index += 1;
        continue;
      }
      
      switch (tag) {
      case "}": case "]": case ")": case "CALL_END": case "INDEX_END":
      case "IDENTIFIER": case "NUMBER": case "BOOL": case "STRING": case "REGEX":
      case "UNDEFINED": case "NULL": case "OUTDENT":
        if (tag === "OUTDENT") {
          indent -= 1;
        }
        if (bracket === 0 && indent === 0) {
          return {tokens:tokens, begin:begin, end:index};
        }
        break;
      case "PARAM_END":
        bracket -= 1;
        break;
      case "INDENT":
        indent += 1;
        break;
      }
      index += 1;
    }
    return {tokens:tokens, begin:begin, end:Math.max(0,tokens.length-2)};
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
    tokens = sortPlusMinusOperator(tokens);
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
  
  var unaryOperatorDict = {
    "+": "__plus__", "-": "__minus__"
  };
  var replaceUnaryOperator = function(tokens) {
    tokens = sortPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "UNARY" && unaryOperatorDict.hasOwnProperty(token[VALUE])) {
        var selector = unaryOperatorDict[token[VALUE]];
        var next = getNextOperand(tokens, i);
        tokens.splice(next.end+1, 0, ["."         , "."     , _]);
        tokens.splice(next.end+2, 0, ["IDENTIFIER", selector, _]);
        tokens.splice(next.end+3, 0, ["CALL_START", "("     , _]);
        tokens.splice(next.end+4, 0, ["CALL_END"  , ")"     , _]);
        tokens.splice(i, 1);
      }
    }
    return tokens;
  };
  
  var binaryOperatorDict = {
    "+": "__add__", "-": "__sub__", "*": "__mul__", "/": "__div__", "%": "__mod__"
  };
  var binaryOperatorAdverbs = {
    W:"WRAP", S:"SHORT", C:"CLIP", F:"FOLD", T:"TABLE", X:"FLAT",
    WRAP:"WRAP", SHORT:"SHORT", CLIP:"CLIP", FOLD:"FOLD", TABLE:"TABLE", FLAT:"FLAT"
  };
  var checkAdvarb = function(tokens, index) {
    var t0 = tokens[index  ];
    var t1 = tokens[index-1];
    var t2 = tokens[index-2];
    if (t0 && t1 && t2) {
      if (t0[VALUE] === t2[VALUE] && binaryOperatorAdverbs.hasOwnProperty(t1[VALUE])) {
        return binaryOperatorAdverbs[t1[VALUE]];
      }
    }
  };
  var replaceBinaryOperator = function(tokens) {
    tokens = sortPlusMinusOperator(tokens);
    for (var i = tokens.length-1; i >= 0; i--) {
      var token = tokens[i];
      if (token[TAG] === "MATH" && binaryOperatorDict.hasOwnProperty(token[VALUE])) {
        var selector = binaryOperatorDict[token[VALUE]];
        var adverb   = checkAdvarb(tokens, i);
        var next = getNextOperand(tokens, i);
        if (adverb) {
          i -= 2;
          tokens.splice(i  , 1, ["."         , "."     , _]);
          tokens.splice(i+1, 1, ["IDENTIFIER", selector, _]);
          tokens.splice(i+2, 1, ["CALL_START", "("     , _]);
          tokens.splice(next.end+1, 0, [","         , ","   , _]);
          tokens.splice(next.end+2, 0, ["IDENTIFIER", adverb, _]);
          tokens.splice(next.end+3, 0, ["CALL_END"  , ")"   , _]);
        } else {
          tokens.splice(i  , 1, ["."         , "."     , _]);
          tokens.splice(i+1, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(i+2, 0, ["CALL_START", "("     , _]);
          tokens.splice(next.end+3, 0, ["CALL_END", ")", _]);
        }
      }
    }
    return tokens;
  };
  
  var compoundAssignOperatorDict = {
    "+=": "__add__",
    "-=": "__sub__",
    "*=": "__mul__",
    "/=": "__div__",
    "%=": "__mod__",
  };
  var replaceCompoundAssign = function(tokens) {
    for (var i = tokens.length; --i > 0; ) {
      var token = tokens[i];
      if (compoundAssignOperatorDict.hasOwnProperty(token[VALUE])) {
        var selector = compoundAssignOperatorDict[token[VALUE]];
        var prev = getPrevOperand(tokens, i);
        var next = getNextOperand(tokens, i);
        tokens.splice(i  , 1, ["="         , "="     , _]);
        tokens.splice(i+1, 0, ["."         , "."     , _]);
        tokens.splice(i+2, 0, ["IDENTIFIER", selector, _]);
        tokens.splice(i+3, 0, ["CALL_START", "("     , _]);
        tokens.splice(next.end+4, 0, ["CALL_END", ")", _]);
        for (var j = prev.begin; j < i; ++j) {
          tokens.splice(i+1, 0, tokens[j]);
        }
      }
    }
    return tokens;
  };
  
  var logicOperatorDict = {
    "&&": "__and__", "||": "__or__"
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
        if (token[TAG] === "LOGIC" && logicOperatorDict.hasOwnProperty(token[VALUE])) {
          var selector = logicOperatorDict[token[VALUE]];
          var next = getNextOperand(tokens, i);
          tokens.splice(i  , 1, ["."         , "."     , _]);
          tokens.splice(i+1, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(i+2, 0, ["CALL_START", "("     , _]);
          tokens.splice(next.end+3, 0, ["CALL_END", ")", _]);
          i = next.end+3; // skip
        }
      }
    }
    return tokens;
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
  var getSynthDefArguments = function(tokens, index) {
    if (tokens[index++][TAG] !== "PARAM_START") {
      return [];
    }
    var args = [];
    while (index < tokens.length) {
      if (tokens[index][TAG] === "PARAM_END") {
        break;
      }
      if (tokens[index][TAG] === "IDENTIFIER") {
        args.push(tokens[index][VALUE]);
        if (tokens[index+1][TAG] !== "=") {
          args.push(0);
        } else {
          var next = getNextOperand(tokens, index+2);
          args.push(formatArgument(next));
          tokens.splice(index+1, next.end-next.begin+2);
        }
      }
      index += 1;
    }
    return args;
  };
  
  var replaceSynthDefinition = function(tokens) {
    for (var i = tokens.length - 1; --i >= 2; ) {
      var token = tokens[i];
      if (token[TAG] === "IDENTIFIER" && token[VALUE] === "def" && tokens[i-1][TAG] === "." &&
          tokens[i-2][TAG] === "IDENTIFIER" && tokens[i-2][VALUE] === "Synth" && tokens[i+1][TAG] === "CALL_START") {
        var args = getSynthDefArguments(tokens, i+2);
        var next = getNextOperand(tokens, i+2);
        tokens.splice(next.end+1, 0, [",", ",", _]);
        tokens.splice(next.end+2, 0, ["[", "[", _]);
        tokens.splice(next.end+3, 0, ["]", "]", _]);
        for (var j = args.length; j--; ) {
          tokens.splice(next.end+3, 0, ["STRING", "'" + args[j] + "'", _]);
          if (j) {
            tokens.splice(next.end+3, 0, [",", ",", _]);
          }
        }
      }
    }
    return tokens;
  };
  
  var replaceGlobalVariants = function(tokens) {
    for (var i = tokens.length - 1; i--; ) {
      var token = tokens[i];
      if (token[TAG] !== "IDENTIFIER") {
        continue;
      }
      if (cc.global.hasOwnProperty(token[VALUE])) {
        if (tokens[i+1][TAG] === ":") {
          continue; // { NotGlobal:"dict key is not global" }
        }
        if (i > 0) {
          if (tokens[i-1][TAG] === "." || tokens[i-1][TAG] === "@") {
            continue; // this.is.NotGlobal, @isNotGlobal
          }
        }
        tokens.splice(i  , 0, ["IDENTIFIER", "cc", _]);
        tokens.splice(i+1, 0, ["."         , "." , _]);
      } else if (/^\$[a-z][a-zA-Z0-9_]*$/.test(token[VALUE])) {
        tokens.splice(i  , 0, ["IDENTIFIER", "global", _]);
        tokens.splice(i+1, 0, ["."         , "."     , _]);
        tokens.splice(i+2, 1, ["IDENTIFIER", token[VALUE].substr(1), _]);
      }
    }
    return tokens;
  };
  
  var finalize = function(tokens) {
    tokens.splice(0, 0, ["("          , "("        , _]);
    tokens.splice(1, 0, ["PARAM_START", "("        , _]);
    tokens.splice(2, 0, ["IDENTIFIER" , "global"   , _]);
    tokens.splice(3, 0, [","          , ","        , _]);
    tokens.splice(4, 0, ["IDENTIFIER" , "undefined", _]);
    tokens.splice(5, 0, ["PARAM_END"  , ")"        , _]);
    tokens.splice(6, 0, ["->"         , "->"       , _]);
    tokens.splice(7, 0, ["INDENT"     , 2          , _]);
    
    var i = tokens.length - 1;
    tokens.splice(i++, 0, ["OUTDENT"   , 2            , _]);
    tokens.splice(i++, 0, [")"         , ")"          , _]);
    tokens.splice(i++, 0, ["."         , "."          , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "call"       , _]);
    tokens.splice(i++, 0, ["CALL_START", "("          , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "cc"         , _]);
    tokens.splice(i++, 0, ["."         , "."          , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "__context__", _]);
    tokens.splice(i++, 0, [","         , ","          , _]);
    tokens.splice(i++, 0, ["THIS"      , "this"       , _]);
    tokens.splice(i++, 0, ["."         , "."          , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "self"       , _]);
    tokens.splice(i++, 0, ["LOGIC"     , "||"         , _]);
    tokens.splice(i++, 0, ["IDENTIFIER", "global"     , _]);
    tokens.splice(i++, 0, ["CALL_END"  , ")"          , _]);
    return tokens;
  };
  
  var CoffeeCompiler = (function() {
    function CoffeeCompiler() {
    }
    CoffeeCompiler.prototype.tokens = function(code) {
      var data = [];
      var tokens = CoffeeScript.tokens(code);
      if (tokens.length) {
        tokens.forEach(function(token) {
          if (token[TAG] === "HERECOMMENT") {
            data.push(token[VALUE].trim());
          }
        });
        tokens = replaceFixedTimeValue(tokens);
        tokens = replaceStrictlyPrecedence(tokens);
        tokens = replaceUnaryOperator(tokens);
        tokens = replaceBinaryOperator(tokens);
        tokens = replaceCompoundAssign(tokens);
        tokens = replaceLogicOperator(tokens);
        tokens = replaceSynthDefinition(tokens);
        tokens = replaceGlobalVariants(tokens);
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
    var tab = function(n) {
      var t = ""; while (n--) { t += "  "; } return t;
    };
    CoffeeCompiler.prototype.toString = function(tokens) {
      var indent = 0;
      if (typeof tokens === "string") {
        tokens = this.tokens(tokens);
      }
      tokens = sortPlusMinusOperator(tokens);
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
          if (token[VALUE].length > 1) {
            return token[VALUE] + " ";
          }
          return token[VALUE];
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
      }).join("").trim();
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
    
    sortPlusMinusOperator  : sortPlusMinusOperator,
    revertPlusMinusOperator: revertPlusMinusOperator,
    getPrevOperand         : getPrevOperand,
    getNextOperand         : getNextOperand,
    replaceFixedTimeValue    : replaceFixedTimeValue,
    replaceStrictlyPrecedence: replaceStrictlyPrecedence,
    replaceUnaryOperator     : replaceUnaryOperator,
    replaceBinaryOperator    : replaceBinaryOperator,
    replaceCompoundAssign    : replaceCompoundAssign,
    replaceLogicOperator     : replaceLogicOperator,
    replaceSynthDefinition   : replaceSynthDefinition,
    replaceGlobalVariants    : replaceGlobalVariants,
    finalize                 : finalize,
    getSynthDefArguments: getSynthDefArguments,
    use:use,
  };

});
