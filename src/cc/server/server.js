define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var commands = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.instanceManager = cc.createInstanceManager();
      this.strm = null;
      this.timer = cc.createTimer();
      this.initialized = false;
      this.syncCount    = new Uint32Array(1);
      this.sysSyncCount = 0;
    }
    
    SynthServer.prototype.sendToLang = function() {
      throw "SynthServer#sendToLang: should be overridden";
    };
    SynthServer.prototype.recvFromLang = function(msg, userId) {
      userId = userId|0;
      if (msg instanceof Uint8Array) {
        this.instanceManager.doBinayCommand(userId, msg);
      } else {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg, userId);
        } else {
          throw new Error("Unknown command: " + msg[0]);
        }
      }
    };
    SynthServer.prototype.connect = function() {
      throw "SynthServer#connect: should be overridden";
    };
    SynthServer.prototype.init = function(msg) {
      if (!this.initialized) {
        this.initialized = true;
        if (msg) {
          this.sampleRate = msg[1]|0;
          this.channels   = msg[2]|0;
          this.strmLength = msg[3]|0;
        }
        this.strm  = new Int16Array(this.strmLength * this.channels);
        this.instanceManager.init(this);
        this.instanceManager.append(0);
        cc.initRateInstance();
      }
    };
    SynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.play(userId);
      if (!this.timer.isRunning()) {
        this.timer.start(this.process.bind(this), C.PROCESSING_INTERVAL);
      }
      this.sendToLang([
        "/played", this.syncCount[0]
      ]);
    };
    SynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.pause(userId);
      if (this.timer.isRunning()) {
        if (!this.instanceManager.isRunning()) {
          this.timer.stop();
        }
      }
      this.sendToLang([
        "/paused", this.syncCount[0]
      ]);
    };
    SynthServer.prototype.reset = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.reset(userId);
    };
    SynthServer.prototype.pushToTimeline = function(msg, userId) {
      userId = userId|0;
      var timeline = msg[1];
      if (timeline.length) {
        this.instanceManager.pushToTimeline(userId, timeline);
      }
    };
    SynthServer.prototype.process = function() {
      throw "SynthServer#process: should be overridden";
    };
    
    return SynthServer;
  })();
    
  
  commands["/init"] = function(msg, userId) {
    this.init(msg, userId);
  };
  commands["/play"] = function(msg, userId) {
    this.play(msg, userId);
  };
  commands["/pause"] = function(msg, userId) {
    this.pause(msg, userId);
  };
  commands["/reset"] = function(msg, userId) {
    this.reset(msg, userId);
  };
  commands["/processed"] = function(msg, userId) {
    this.pushToTimeline(msg, userId);
  };
  commands["/socket/sendToServer"] = function(msg, userId) {
    // receive a message from the lang-interface via the lang
    if (this.exports) {
      msg = msg[1];
      msg.userId = userId;
      this.exports.emit("message", msg);
    }
  };
  
  cc.SynthServer = SynthServer;
  
  // TODO: moved
  require("../common/timer");
  require("./instance");
  require("./rate");
  require("./unit");
  require("./server-worker");
  require("./server-nodejs");
  require("./server-socket");
  require("./basic_unit");
  require("../plugins/installer");
  
  cc.createSynthServer = function() {
    switch (cc.opmode) {
    case "worker":
      return cc.createWorkerSynthServer();
    case "nodejs":
      return cc.createNodeJSSynthServer();
    case "socket":
      return cc.createSocketSynthServer();
    }
    throw new Error("A SynthServer is not defined for: " + cc.opmode);
  };
  
  module.exports = {};

});
