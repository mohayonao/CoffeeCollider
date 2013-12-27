define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  var pack   = require("../common/pack").pack;
  var random = require("../common/random");
  var commands = {};
  
  var SynthLang = (function() {
    function SynthLang() {
      this.klassName = "SynthLang";
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.rootNode    = cc.createLangRootNode();
      this.taskManager = cc.createTaskManager();
      this.timelineResult  = [];
      this.phase = 0;
      this.random = new random.Random();
      this.currentTime = 0;
      this.callbacks   = [];
      
      this.extendCommands(commands);
    }
    
    SynthLang.prototype.sendToClient = function() {
      throw "SynthLang#sendToClient: should be overridden[" + cc.opmode + "]";
    };
    SynthLang.prototype.recvFromClient = function(msg) {
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthLang.prototype.sendToServer = function() {
      throw "SynthLang#sendToServer: should be overridden[" + cc.opmode + "]";
    };
    SynthLang.prototype.recvFromServer = function(msg) {
      if (msg instanceof Float32Array) {
        this.sendToClient(msg);
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    SynthLang.prototype.pushToTimeline = function(cmd) {
      this.timelineResult.push(cmd);
    };
    SynthLang.prototype.play = function(msg) {
      this.currentTimeIncr = (this.bufLength / this.sampleRate) * 1000;
      this.taskManager.start(this.currentTimeIncr);
      this.sendToServer(msg);
    };
    SynthLang.prototype.pause = function(msg) {
      this.sendToServer(msg);
    };
    SynthLang.prototype.reset = function(msg) {
      this.currentTime = 0;
      cc.resetNode();
      cc.resetBuiltin();
      cc.resetMessage();
      this.taskManager.reset();
      this.sendToServer(msg);
    };
    SynthLang.prototype.requestBuffer = function(path, callback) {
      if (!(typeof path === "string" && typeof callback === "function")) {
        return;
      }
      var callbackId = this.setCallback(callback);
      this.sendToClient(["/buffer/request", path, callbackId]);
    };
    SynthLang.prototype.process = function() {
      throw "SynthLang#process: should be overridden";
    };
    SynthLang.prototype.extendCommands = function() {
    };
    SynthLang.prototype.setCallback = function(callback) {
      var callbackId = this.callbacks.length;
      this.callbacks[callbackId] = callback;
      return callbackId;
    };
    SynthLang.prototype.getCallback = function(callbackId) {
      var callback = this.callbacks[callbackId];
      this.callbacks[callbackId] = null;
      return callback;
    };
    
    return SynthLang;
  })();
  
  
  commands["/connected"] = function(msg) {
    if (cc.opmode !== "nodejs") {
      msg.push(Object.keys(cc.global));
    }
    this.sendToClient(msg);
  };
  commands["/init"] = function(msg) {
    this.sampleRate = msg[1]|0;
    this.channels   = msg[2]|0;
    this.sendToServer(msg);
  };
  commands["/play"] = function(msg) {
    this.play(msg);
  };
  commands["/played"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/pause"] = function(msg) {
    this.pause(msg);
  };
  commands["/paused"] = function(msg) {
    this.sendToClient(msg);
  };
  commands["/reset"] = function(msg) {
    this.reset(msg);
  };
  commands["/process"] = function() {
    this.process();
  };
  commands["/execute"] = function(msg) {
    var execId   = msg[1];
    var code     = msg[2];
    var append   = msg[3];
    var callback = msg[4];
    if (!append) {
      this.reset(["/reset"]);
    }
    if (cc.global !== global) {
      global.cc = cc.global;
    }
    global.cc.__context__ = {
      version: cc.version
    };
    var result = eval.call(global, code);
    if (callback) {
      this.sendToClient(["/executed", execId, pack(result)]);
    }
  };
  commands["/buffer/response"] = function(msg) {
    var buffer = msg[1];
    var callbackId = msg[2];
    var callback = this.getCallback(callbackId);
    if (callback) {
      callback(buffer);
    }
  };
  commands["/send"] = function(msg) {
    var args = msg[1];
    cc.global.Message.emit.apply(cc.global.Message, args);
  };

  commands["/b_get"] = function(msg) {
    var callbackId = msg[1];
    var callback = this.getCallback(callbackId);
    if (callback) {
      callback(msg[2]);
    }
  };
  commands["/b_getn"] = function(msg) {
    var callbackId = msg[1];
    var callback = this.callbacks[callbackId];
    if (callback) {
      callback(msg.slice(2));
      this.callbacks[callbackId] = null;
    }
  };
  commands[C.BINARY_CMD_SET_BUFFER] = function(binary) {
    var callbackId = (binary[3] << 8) + binary[2];
    var callback = this.getCallback(callbackId);
    if (callback) {
      callback(binary);
    }
  };
  
  cc.SynthLang = SynthLang;
  
  cc.createSynthLang = function() {
    switch (cc.opmode) {
    case "worker":
      return cc.createWorkerSynthLang();
    case "nodejs":
      return cc.createNodeJSSynthLang();
    case "socket":
      return cc.createSocketSynthLang();
    }
    throw new Error("A SynthLang is not defined for: " + cc.opmode);
  };
  
  // TODO: moved
  require("./array");
  require("./boolean");
  require("./buffer");
  require("./builtin");
  require("./bus");
  require("./date");
  require("./env");
  require("./function");
  require("./message");
  require("./mix");
  require("./node");
  require("./number");
  require("./object");
  require("./pattern");
  require("./scale");
  require("./string");
  require("./syncblock");
  require("./synthdef");
  require("./task");
  require("./ugen");
  require("./basic_ugen");
  require("../plugins/installer");
  
  require("./lang-worker");
  require("./lang-nodejs");
  require("./lang-socket");

  Object.keys(cc.ugen.specs).forEach(function(name) {
    cc.ugen.register(name, cc.ugen.specs[name]);
  });
  
  cc.global.System = {};
  cc.global.System.currentTime = function() {
    return cc.lang.currentTime;
  };
  
  module.exports = {};

});
