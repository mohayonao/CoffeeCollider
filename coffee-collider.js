(function(global) {
"use strict";
var _define = function(module, /*deps,*/ payload) {
  if (!_define.modules) {
    _define.modules  = {};
    _define.payloads = {};
  }
  _define.payloads[module] = payload;
  _define.modules[module]  = null;
};
var _require = function(parentId, moduleName) {
  moduleName = normalizeModule(parentId, moduleName);
  var module = _define.modules[moduleName];
  if (!module) {
    module = _define.payloads[moduleName];
    var exports = {};
    var mod = { id:moduleName, exports:exports };
    var req = function(module) {
      return _require(moduleName, module);
    };
    var ret = module(req, exports, mod);
    exports = ret || mod.exports;
    _define.modules[moduleName] = exports;
    delete _define.payloads[moduleName];
  }
  module = _define.modules[moduleName] = exports || module;
  return module;
};
var normalizeModule = function(parentId, moduleName) {
  if (moduleName.charAt(0) === ".") {
    var base = parentId.split("/").slice(0, -1).join("/");
    moduleName = base + "/" + moduleName;
    var previous;
    while (moduleName.indexOf(".") !== -1 && previous !== moduleName) {
      previous   = moduleName;
      moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
    }
  }
  return moduleName;
};
var define = _define;
define('cc/loader', function(require, exports, module) {

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    cc.context = "client";
    require("./client/installer").install(global);
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "server";
    require("./server/installer").install(global);
  }
  
  module.exports = {
  };

});
define('cc/cc', function(require, exports, module) {

  module.exports = {};

});
define('cc/client/installer', function(require, exports, module) {

  var cc = require("cc/cc");
  var CoffeeCollider = require("./coffee-collider").CoffeeCollider;

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        if (!cc.coffeeColliderPath) {
          m = /^.*\/coffee-collider(?:-min)?\.js/.exec(scripts[i].src);
          if (m) {
            cc.coffeeColliderPath = m[0];
            break;
          }
        }
      }
    }
  }
  
  var install = function(global) {
    global.CoffeeCollider = CoffeeCollider;
  };

  module.exports = {
    install: install
  };

});
define('cc/client/coffee-collider', function(require, exports, module) {

  var SynthClient = require("./client").SynthClient;

  var CoffeeCollider = (function() {
    function CoffeeCollider() {
      this.client = new SynthClient();
      this.sampleRate = this.client.sampleRate;
      this.channels   = this.client.channels;
      this.compiler   = this.client.compiler;
    }
    CoffeeCollider.prototype.destroy = function() {
      if (this.client) {
        this.client.destroy();
        delete this.client;
        delete this.sampleRate;
        delete this.channels;
      }
      return this;
    };
    CoffeeCollider.prototype.play = function() {
      if (this.client) {
        this.client.play();
      }
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      if (this.client) {
        this.client.reset();
      }
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      if (this.client) {
        this.client.pause();
      }
      return this;
    };
    CoffeeCollider.prototype.exec = function(code, callback) {
      if (this.client) {
        this.client.exec(code, callback);
      }
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      if (this.client) {
        return this.client.strm;
      }
    };
    CoffeeCollider.prototype.loadScript = function(path) {
      if (this.client) {
        this.client.loadScript(path);
      }
      return this;
    };
    return CoffeeCollider;
  })();

  module.exports = {
    CoffeeCollider: CoffeeCollider
  };

});
define('cc/client/client', function(require, exports, module) {

  var cc = require("cc/cc");
  var SoundSystem = require("./sound-system").SoundSystem;
  var Compiler = require("./compiler").Compiler;

  var commands = {};
  
  var SynthClient = (function() {
    function SynthClient() {
      var that = this;
      this.worker = new Worker(cc.coffeeColliderPath);
      this.worker.addEventListener("message", function(e) {
        var msg = e.data;
        if (msg instanceof Float32Array) {
            that.strmList[that.strmListWriteIndex] = msg;
            that.strmListWriteIndex = (that.strmListWriteIndex + 1) & 7;
        } else {
          that.recv(msg);
        }
      });
      this.compiler = new Compiler();
      
      this.isConnected = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sys = SoundSystem.getInstance();
      this.sys.append(this);

      this.sampleRate = this.sys.sampleRate;
      this.channels   = this.sys.channels;
      this.strmLength = this.sys.strmLength;
      this.bufLength  = this.sys.bufLength;
      
      this.isPlaying = false;
      this.strm = new Float32Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
    }
    SynthClient.prototype.destroy = function() {
      this.sys.remove(this);
      delete this.worker;
    };
    SynthClient.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.sys.play();
        this.send(["/play", this.sys.syncCount]);
      }
    };
    SynthClient.prototype.reset = function() {
    };
    SynthClient.prototype.pause = function() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.sys.pause();
        this.send(["/pause"]);
      }
    };
    SynthClient.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
    };
    SynthClient.prototype.exec = function(code, callback) {
      if (typeof code === "string") {
        code = this.compiler.compile(code.trim());
        this.send(["/exec", this.execId, code]);
        if (typeof callback === "function") {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    SynthClient.prototype.loadScript = function(path) {
      this.send(["/loadScript", path]);
    };
    SynthClient.prototype.send = function(msg) {
      this.worker.postMessage(msg);
    };
    SynthClient.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthClient.prototype.sync = function(syncItems) {
      this.send(syncItems);
    };
    return SynthClient;
  })();

  commands["/connect"] = function() {
    this.isConnected = true;
    this.send([
      "/init", this.sampleRate, this.channels, this.strmLength, this.bufLength, this.sys.syncCount
    ]);
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this.execCallbacks[execId];
    if (callback) {
      if (result !== undefined) {
        result = JSON.parse(result);
      }
      callback(result);
      delete this.execCallbacks[execId];
    }
  };
  commands["/console/log"] = function(msg) {
    console.log.apply(console, msg[1]);
  };
  commands["/console/debug"] = function(msg) {
    console.debug.apply(console, msg[1]);
  };
  commands["/console/info"] = function(msg) {
    console.info.apply(console, msg[1]);
  };
  commands["/console/error"] = function(msg) {
    console.error.apply(console, msg[1]);
  };
  
  module.exports = {
    SynthClient: SynthClient
  };

});
define('cc/client/sound-system', function(require, exports, module) {

  var SoundSystem = (function() {
    function SoundSystem() {
      var SoundAPI    = getAPI();
      this.sampleRate = 44100;
      this.channels   = 2;
      if (SoundAPI) {
        this.driver = new SoundAPI(this);
        this.sampleRate = this.driver.sampleRate;
        this.channels   = this.driver.channels;
      }
      this.colliders  = [];
      this.process    = process0;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.clear = new Float32Array(this.strmLength * this.channels);
      this.syncCount = 0;
      this.syncItems = new Float32Array(6); // syncCount, currentTime
      this.isPlaying = false;
    }
    var instance = null;
    SoundSystem.getInstance = function() {
      if (!instance) {
        instance = new SoundSystem();
      }
      return instance;
    };
    SoundSystem.prototype.append = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index === -1) {
        this.colliders.push(cc);
        if (this.colliders.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
    };
    SoundSystem.prototype.remove = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index !== -1) {
        this.colliders.splice(index, 1);
      }
      if (this.colliders.length === 1) {
        this.process = process1;
      } else if (this.colliders.length === 0) {
        this.process = process0;
      } else {
        this.process = processN;
      }
    };
    SoundSystem.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.syncCount = 0;
        this.driver.play();
      }
    };
    SoundSystem.prototype.pause = function() {
      if (this.isPlaying) {
        var flag = this.colliders.every(function(cc) {
          return !cc.isPlaying;
        });
        if (flag) {
          this.isPlaying = false;
          this.driver.pause();
        }
      }
    };

    var process0 = function() {
      this.strm.set(this.clear);
    };
    var process1 = function() {
      var cc = this.colliders[0];
      this.syncItems[0] = this.syncCount;
      cc.process();
      this.strm.set(cc.strm);
      cc.sync(this.syncItems);
      this.syncCount++;
    };
    var processN = function() {
      var strm = this.strm;
      var strmLength = strm.length;
      var colliders  = this.colliders;
      var syncItems  = this.syncItems;
      var cc, tmp;
      syncItems[0] = this.syncCount;
      strm.set(this.clear);
      for (var i = 0, imax = colliders.length; i < imax; ++i) {
        cc = colliders[i];
        cc.process();
        tmp = cc.strm;
        for (var j = 0; j < strmLength; j += 8) {
          strm[j  ] += tmp[j  ]; strm[j+1] += tmp[j+1]; strm[j+2] += tmp[j+2]; strm[j+3] += tmp[j+3];
          strm[j+4] += tmp[j+4]; strm[j+5] += tmp[j+5]; strm[j+6] += tmp[j+6]; strm[j+7] += tmp[j+7];
        }
        cc.sync(syncItems);
      }
      this.syncCount++;
    };
    
    return SoundSystem;
  })();

  var getAPI = function() {
    return require("./web-audio-api").getAPI();
  };

  module.exports = {
    SoundSystem: SoundSystem
  };

});
define('cc/client/web-audio-api', function(require, exports, module) {

  var klass;
  module.exports = {
    getAPI: function() {
      return klass;
    }
  };

  var AudioContext = global.AudioContext || global.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  function WebAudioAPI(sys) {
    this.sys = sys;
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    this.channels   = sys.channels;
  }

  WebAudioAPI.prototype.play = function() {
    var sys = this.sys;
    var onaudioprocess;
    var strmLength  = sys.strmLength;
    var strmLength4 = strmLength * 4;
    var buffer = sys.strm.buffer;
    if (this.sys.sampleRate === this.sampleRate) {
      onaudioprocess = function(e) {
        var outs = e.outputBuffer;
        sys.process();
        outs.getChannelData(0).set(new Float32Array(
          buffer.slice(0, strmLength4)
        ));
        outs.getChannelData(1).set(new Float32Array(
          buffer.slice(strmLength4)
        ));
      };
    }
    this.bufSrc = this.context.createBufferSource();
    this.jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
    this.jsNode.onaudioprocess = onaudioprocess;
    this.bufSrc.noteOn(0);
    this.bufSrc.connect(this.jsNode);
    this.jsNode.connect(this.context.destination);
  };
  WebAudioAPI.prototype.pause = function() {
    this.bufSrc.disconnect();
    this.jsNode.disconnect();
  };

  klass = WebAudioAPI;

});
define('cc/client/compiler', function(require, exports, module) {

  var CoffeeScript = (function() {
    if (global.CoffeeScript) {
      return global.CoffeeScript;
    }
    try {
      return require(["coffee-script"][0]);
    } catch(e) {}
  })();

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
  // TERMINATOR

  var TAG   = 0;
  var VALUE = 1;
  var _     = {}; // empty location
  
  var dumpTokens = function(tokens) {
    console.log(tokens.map(function(t) {
      return t[0] + "\t" + t[1];
    }).join("\n"));
  };
  
  var tab = function(n) {
    var t = "";
    while (n--) {
      t += " ";
    }
    return t;
  };
  
  var findOperandHead = function(tokens, index) {
    var bracket = 0;
    index -= 1;
    while (0 < index) {
      var token = tokens[index - 1];
      if (!token || token[TAG] !== ".") {
        token = tokens[index];
        switch (token[TAG]) {
        case "INDENT":
          return index + 1;
        case "(": case "[": case "{":
          bracket -= 1;
          /* falls through */
        case "IDENTIFIER":
        case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED":
          if (bracket === 0) {
            token = tokens[index - 1];
            if (token) {
              if (token[TAG] === "UNARY") {
                return index - 1;
              }
              if (token[VALUE] === "+" || token[VALUE] === "-") {
                token = tokens[index - 2];
                if (!token) {
                  return index - 1;
                }
                switch (token[TAG]) {
                case "INDENT": case "TERMINATOR": case "CALL_START":
                case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
                case "SHIFT": case "COMPARE": case "=": case "..": case "...":
                case "[": case "(": case "{": case ",": case "?":
                  return index - 1;
                }
              }
            }
            return index;
          }
          break;
        case "}": case "]": case ")": case "CALL_END":
          bracket += 1;
          break;
        }
      }
      index -= 1;
    }
    return 0;
  };

  var findOperandTail = function(tokens, index) {
    var bracket = 0;
    index += 1;
    while (index < tokens.length) {
      var token = tokens[index];
      switch (token[TAG]) {
        case "}": case "]": case ")": case "CALL_END":
        bracket -= 1;
      }
      token = tokens[index + 1];
      if (!token || token[TAG] !== ".") {
        token = tokens[index];
        switch (token[TAG]) {
        case "TERMINATOR": case "OUTDENT":
          return index - 1;
        case "IDENTIFIER":
          token = tokens[index + 1];
          if (token && token[TAG] === "CALL_START") {
            bracket += 1;
            break;
          }
          if (bracket === 0) {
            return index;
          }
          break;
        case "NUMBER": case "STRING": case "BOOL":
        case "REGEX": case "NULL": case "UNDEFINED":
          if (bracket === 0) {
            return index;
          }
          break;
        case "(": case "[": case "{":
          bracket += 1;
          break;
        case "}": case "]": case ")": case "CALL_END":
          if (bracket === 0) {
            return index;
          }
          break;
        }
      }
      index += 1;
    }
    return tokens.length - 1;
  };

  var replacePi = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var a, b, token = tokens[i];
      if (token[VALUE] === "pi") {
        tokens.splice(i, 1);
        token = tokens[i - 1];
        if (token && token[TAG] === "NUMBER") {
          a = findOperandHead(tokens, i);
          tokens.splice(i, 0, ["MATH", "*", _]);
          b = i;
        } else {
          a = -1;
          b = i - 1;
        }
        tokens.splice(b+1, 0, ["IDENTIFIER", "Math", _]);
        tokens.splice(b+2, 0, ["."         , "."   , _]);
        tokens.splice(b+3, 0, ["IDENTIFIER", "PI"  , _]);
        if (a !== -1) {
          tokens.splice(b+4, 0, [")", ")", _]);
          tokens.splice(a, 0, ["(", "(", _]);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replacePrecedence = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      if (token[TAG] === "MATH") {
        var a = findOperandHead(tokens, i);
        var b = findOperandTail(tokens, i) + 1;
        tokens.splice(b, 0, [")", ")" , _]);
        tokens.splice(a, 0, ["(", "(" , _]);
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replaceUnaryOpTable = {
    "+": "num",
    "-": "neg",
    "!": "not",
    "~": "tilde",
  };

  var replaceUnaryOp = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      var selector = replaceUnaryOpTable[token[VALUE]];
      if (selector) {
        token = tokens[i - 1] || { 0:"TERMINATOR" };
        switch (token[TAG]) {
        case "INDENT": case "TERMINATOR": case "CALL_START":
        case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
        case "SHIFT": case "COMPARE": case "=": case "..": case "...":
        case "[": case "(": case "{": case ",": case "?":
          var a = findOperandTail(tokens, i);
          tokens.splice(a+1, 0, ["."         , "."     , _]);
          tokens.splice(a+2, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(a+3, 0, ["CALL_START", "("     , _]);
          tokens.splice(a+4, 0, ["CALL_END"  , ")"     , _]);
          tokens.splice(i, 1);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };
  
  var replaceBinaryOpTable = {
    "+": "__add__",
    "-": "__sub__",
    "*": "__mul__",
    "/": "__div__",
    "%": "__mod__",
  };
  
  var replaceBinaryOp = function(tokens) {
    var i = tokens.length - 1;
    var replaceable = false;
    while (0 <= i) {
      var token = tokens[i];
      if (replaceable) {
        var selector = replaceBinaryOpTable[token[VALUE]];
        if (selector) {
          var b = findOperandTail(tokens, i) + 1;
          tokens.splice(i  , 1, ["."         , "."     , _]);
          tokens.splice(i+1, 0, ["IDENTIFIER", selector, _]);
          tokens.splice(i+2, 0, ["CALL_START", "("     , _]);
          tokens.splice(b+2, 0, ["CALL_END"  , ")"     , _]);
          replaceable = false;
          continue;
        }
      }
      token = tokens[i - 1] || { 0:"TERMINATOR" };
      switch (token[TAG]) {
      case "INDENT": case "TERMINATOR": case "CALL_START":
      case "COMPOUND_ASSIGN": case "UNARY": case "LOGIC":
      case "SHIFT": case "COMPARE": case "=": case "..": case "...":
      case "[": case "(": case "{": case ",": case "?":
        replaceable = false;
        break;
      default:
        replaceable = true;
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var replaceCompoundAssignTable = {
    "+=": "__add__",
    "-=": "__sub__",
    "*=": "__mul__",
    "/=": "__div__",
    "%=": "__mod__",
  };
  
  var replaceCompoundAssign = function(tokens) {
    var i = tokens.length - 1;
    while (0 <= i) {
      var token = tokens[i];
      var selector = replaceCompoundAssignTable[token[VALUE]];
      if (selector) {
        var a = findOperandHead(tokens, i);
        var b = findOperandTail(tokens, i) + 1;
        tokens[i] = ["=", "=", _];
        tokens.splice(i+1, 0, ["."         , "."     , _]);
        tokens.splice(i+2, 0, ["IDENTIFIER", selector, _]);
        tokens.splice(i+3, 0, ["CALL_START", "("     , _]);
        tokens.splice(b+3, 0, ["CALL_END"  , ")"     , _]);
        for (var j = a; j < i; j++) {
          tokens.splice(i+1, 0, tokens[j]);
        }
      }
      i -= 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };

  var cleanupParenthesis = function(tokens) {
    var i = 0;
    var bracket = 0;
    while (i < tokens.length) {
      var token = tokens[i];
      if (token[TAG] === "(") {
        token = tokens[i + 1];
        if (token && token[TAG] === "(") {
          bracket = 2;
          for (var j = i + 2; j < tokens.length; j++) {
            token = tokens[j][TAG];
            if (token === "(") {
              bracket += 1;
            } if (token === ")") {
              bracket -= 1;
              if (bracket === 0) {
                if (tokens[j - 1][TAG] === ")") {
                  tokens.splice(j, 1);
                  tokens.splice(i, 1);
                  i -= 1;
                }
                break;
              }
            }
          }
        }
      }
      i += 1;
    }
    // dumpTokens(tokens);
    return tokens;
  };
  
  var Compiler = (function() {
    function Compiler() {
    }
    Compiler.prototype.tokens = function(code) {
      var tokens = CoffeeScript.tokens(code);
      tokens = replacePi(tokens);
      tokens = replaceUnaryOp(tokens);
      tokens = replacePrecedence(tokens);
      tokens = replaceBinaryOp(tokens);
      tokens = replaceCompoundAssign(tokens);
      tokens = cleanupParenthesis(tokens);
      return tokens;
    };
    Compiler.prototype.compile = function(code) {
      var tokens = this.tokens(code);
      return CoffeeScript.nodes(tokens).compile({bare:true}).trim();
    };
    Compiler.prototype.toString = function(tokens) {
      var indent = 0;
      if (typeof tokens === "string") {
        tokens = this.tokens(tokens);
      }
      return tokens.map(function(token) {
        switch (token[TAG]) {
        case "TERMINATOR":
          return "\n";
        case "INDENT":
          indent += token[VALUE]|0;
          return "\n" + tab(indent);
        case "OUTDENT":
          indent -= token[VALUE]|0;
          return "\n" + tab(indent);
        case ",":
          return token[VALUE] + " ";
        default:
          return token[VALUE];
        }
      }).join("").trim();
    };
    return Compiler;
  })();

  module.exports = {
    Compiler  : Compiler,
    dumpTokens: dumpTokens,
    findOperandHead: findOperandHead,
    findOperandTail: findOperandTail,
    replacePi            : replacePi,
    replacePrecedence    : replacePrecedence,
    replaceBinaryOp      : replaceBinaryOp,
    replaceUnaryOp       : replaceUnaryOp,
    replaceCompoundAssign: replaceCompoundAssign,
    cleanupParenthesis   : cleanupParenthesis,
  };

});
define('cc/server/installer', function(require, exports, module) {

  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = function(name) {
      if (!/^__.*__$/.test(name)) {
        namespace[name] = function(recv) {
          if (recv !== null && recv !== undefined) {
            var func = recv[name];
            if (typeof func === "function") {
              return func.apply(recv, Array.prototype.slice.call(arguments, 1));
            } else {
              return func;
            }
          }
          return 0;
        };
      }
    };
    require("./server").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    delete namespace.register;
  };

  module.exports = {
    install: install
  };

});
define('cc/server/server', function(require, exports, module) {

  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sysSyncCount   = 0;
      this.sysCurrentTime = 0;
      this.syncItems = new Float32Array(6);
      this.onaudioprocess = this.onaudioprocess.bind(this);
      this.timerId = 0;
    }
    SynthServer.prototype.send = function(msg) {
      postMessage(msg);
    };
    SynthServer.prototype.recv = function(msg) {
      if (!msg) {
        return;
      }
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthServer.prototype.onaudioprocess = function() {
      if (this.syncCount - this.sysSyncCount >= 4) {
        return;
      }
      var strm = this.strm;
      for (var i = 0; i < strm.length; i++) {
        strm[i] = Math.random() * 0.5 - 0.25;
      }
      this.syncCount += 1;
      this.send(strm);
    };
    return SynthServer;
  })();

  commands["/init"] = function(msg) {
    this.sampleRate = msg[1];
    this.channels   = msg[2];
    this.strmLength = msg[3];
    this.bufLength  = msg[4];
    this.syncCount  = msg[5];
    this.strm = new Float32Array(this.strmLength * this.channels);
  };
  commands["/play"] = function(msg) {
    if (this.timerId === 0) {
      this.timerId = setInterval(this.onaudioprocess, 10);
      this.syncCount = msg[1];
    }
  };
  commands["/pause"] = function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = 0;
    }
  };
  commands["/exec"] = function(msg) {
    var execId = msg[1];
    var code   = msg[2];
    var result = eval.call(global, code);
    this.send(["/exec", execId, JSON.stringify(result)]);
  };
  commands["/loadScript"] = function(msg) {
    importScripts(msg[1]);
  };

  var install = function() {
    var server = new SynthServer();
    addEventListener("message", function(e) {
      var msg = e.data;
      if (msg instanceof Float32Array) {
        server.sysSyncCount   = msg[0]|0;
        server.sysCurrentTime = msg[1]|0;
        server.syncItems.set(msg);
      } else {
        server.recv(msg);
      }
    });
    server.send(["/connect"]);
    global.console = (function() {
      var console = {};
      ["log", "debug", "info", "error"].forEach(function(method) {
        console[method] = function() {
          server.send(["/console/" + method, Array.prototype.slice.call(arguments)]);
        };
      });
      return console;
    })();
  };
  
  module.exports = {
    SynthServer: SynthServer,
    install: install
  };

});
define('cc/server/bop', function(require, exports, module) {

  var install = function(namespace) {
    var nonCastFunc = function(key, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return this[key](b);
          }, this);
        }
        return func(this, b);
      };
    };
    var numCastFunc = function(key, func) {
      return function(b) {
        if (Array.isArray(b)) {
          return b.map(function(b) {
            return (+this)[key](b);
          }, this);
        }
        return func(+this, b);
      };
    };
    
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      Number.prototype[key] = nonCastFunc(key, func);
      if (calcFunc[key].array) {
        func = calcFunc[key];
      }
      Array.prototype[key] = function(b) {
        var a = this;
        if (Array.isArray(b)) {
          return b.map(function(b, index) {
            return a[index % a.length][key](b);
          });
        }
        return a.map(function(a) {
          return a[key](b);
        });
      };
      if (calcFunc[key].bool) {
        func = calcFunc[key];
        Boolean.prototype[key] = nonCastFunc(key, func);
      } else {
        Boolean.prototype[key] = numCastFunc(key, func);
      }
      if (calcFunc[key].str) {
        func = calcFunc[key].str;
        String.prototype[key] = nonCastFunc(key, func);
      } else {
        String.prototype[key] = numCastFunc(key, func);
      }
      if (namespace && namespace.register) {
        namespace.register(key);
      }
    });
  };

  var calcFunc = {};

  calcFunc.__add__ = function(a, b) {
    return a + b;
  };
  calcFunc.__add__.str = calcFunc.__add__;
  calcFunc.__sub__ = function(a, b) {
    return a - b;
  };
  calcFunc.__mul__ = function(a, b) {
    return a * b;
  };
  calcFunc.__mul__.str = function(a, b) {
    if (typeof b === "number") {
      var list = new Array(Math.max(0, b));
      for (var i = 0; i < b; i++) {
        list[i] = a;
      }
      return list.join("");
    }
    return a;
  };
  calcFunc.__div__ = function(a, b) {
    return a / b;
  };
  calcFunc.__mod__ = function(a, b) {
    return a % b;
  };
  
  module.exports = {
    install: install,
  };

});
define('cc/server/uop', function(require, exports, module) {

  var install = function(namespace) {
    Object.keys(calcFunc).forEach(function(key) {
      var func = calcFunc[key];
      Number.prototype[key] = function() {
        return func(this);
      };
      Array.prototype[key] = function() {
        return this.map(function(i) {
          return i[key]();
        });
      };
      Boolean.prototype[key] = function() {
        return func(+this);
      };
      String.prototype[key] = function() {
        return func(+this);
      };
      if (namespace && namespace.register) {
        namespace.register(key);
      }
    });
  };

  var calcFunc = {};

  calcFunc.num = function(a) {
    return +a;
  };
  calcFunc.neg = function(a) {
    return -a;
  };
  calcFunc.not = function(a) {
    return !a;
  };
  calcFunc.tilde = function(a) {
    return ~a;
  };

  module.exports = {
    install: install
  };

});
_require("cc/cc", "cc/loader");
})(this.self||global);
