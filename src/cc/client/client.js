define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  var fn = require("./fn");
  var pack  = require("../common/pack").pack;
  var Timer    = require("../common/timer").Timer;
  var Timeline = require("./sched").Timeline;
  var node     = require("./node");
  var buffer   = require("./buffer");
  var commands = {};
  
  var SynthClient = (function() {
    function SynthClient() {
      this.klassName = "SynthClient";
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.userId     = 0;
      this.timer      = new Timer();
      this.timeline   = new Timeline(this);
      this.rootNode   = new node.Group();
      this.commandList = [];
      this.bufferRequestId = 0;
      this.bufferRequestCallback = {};
    }
    SynthClient.prototype.sendToIF = function(msg) {
      postMessage(msg);
    };
    SynthClient.prototype.recvFromIF = function(msg) {
      var func = commands[msg[0]];
      if (func) {
        func.call(this, msg);
      }
    };
    SynthClient.prototype.sendToServer = function() {
      // should be overridden
    };
    SynthClient.prototype.recvFromServer = function(msg) {
      if (msg instanceof Float32Array) {
        this.sendToIF(msg);
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthClient.prototype.pushCommand = function(cmd) {
      this.commandList.push(cmd);
    };
    SynthClient.prototype.play = function() {
    };
    SynthClient.prototype.pause = function() {
    };
    SynthClient.prototype.reset = function() {
    };
    SynthClient.prototype.requestBuffer = function() {
    };
    SynthClient.prototype.process = function() {
    };
    return SynthClient;
  })();

  var WorkerSynthClient = (function() {
    function WorkerSynthClient() {
      SynthClient.call(this);
    }
    fn.extend(WorkerSynthClient, SynthClient);
    WorkerSynthClient.prototype.requestBuffer = function(path, callback) {
      if (!(typeof path === "string" && typeof callback === "function")) {
        return;
      }
      var requestId = this.bufferRequestId++;
      this.bufferRequestCallback[requestId] = callback;
      this.sendToIF(["/buffer/request", path, requestId]);
    };
    WorkerSynthClient.prototype.play = function(msg) {
      if (!this.timer.isRunning) {
        this.processStart = Date.now();
        this.processDone  = 0;
        this.processInterval = (this.strmLength / this.sampleRate) * 1000;
        this.timer.start(this.process.bind(this), this.processInterval * 0.5);
        this.timeline.play();
        this.sendToServer(msg);
      }
    };
    WorkerSynthClient.prototype.pause = function(msg) {
      if (this.timer.isRunning) {
        this.timeline.pause();
        this.timer.stop();
        this.sendToServer(msg);
      }
    };
    WorkerSynthClient.prototype.reset = function(msg) {
      buffer.reset();
      node.reset();
      this.timeline.reset();
      this.sendToServer(msg);
    };
    WorkerSynthClient.prototype.process = function() {
      if (this.processDone - 25 > Date.now() - this.processStart) {
        return;
      }
      var userId   = this.userId;
      var timeline = this.timeline;
      var server   = cc.server;
      var n = this.strmLength / this.bufLength;
      server.preprocess();
      while (n--) {
        timeline.process();
        this.sendToServer([
          "/command", userId, [ this.commandList ]
        ]);
        this.commandList = [];
        server.process();
      }
      server.postprocess();
      this.processDone += this.processInterval;
    };
    return WorkerSynthClient;
  })();

  commands["/connect"] = function(msg) {
    var sampleRate = msg[1]|0;
    var channels   = msg[2]|0;
    var strmLength = msg[3]|0;
    var bufLength  = msg[4]|0;
    this.userId = msg[5]|0;
    this.sendToIF([
      "/connect", sampleRate, channels, strmLength, bufLength
    ]);
  };
  commands["/init"] = function(msg) {
    this.sampleRate = msg[1];
    this.channels   = msg[2];
    this.strmLength = msg[3];
    this.bufLength  = msg[4];
    this.sendToServer(msg);
  };
  commands["/play"] = function(msg) {
    this.play(msg);
  };
  commands["/pause"] = function(msg) {
    this.pause(msg);
  };
  commands["/reset"] = function(msg) {
    this.reset(msg);
  };
  commands["/execute"] = function(msg) {
    var execId   = msg[1];
    var code     = msg[2];
    var append   = msg[3];
    var data     = msg[4];
    var callback = msg[5];
    if (!append) {
      this.reset(["/reset"]);
    }
    global.DATA = data;
    var result = eval.call(global, code);
    if (callback) {
      this.sendToIF(["/execute", execId, pack(result)]);
    }
  };
  commands["/buffer/response"] = function(msg) {
    var buffer = msg[1];
    var requestId = msg[2];
    var callback = this.bufferRequestCallback[requestId];
    if (callback) {
      callback(buffer);
      delete this.bufferRequestCallback[requestId];
    }
  };
  commands["/importScripts"] = function(msg) {
    importScripts(msg[1]);
  };
  commands["/n_end"] = function(msg) {
    var nodeId = msg[1]|0;
    var n = node.get(nodeId);
    if (n) {
      n.emit("end");
    }
  };
  commands["/n_done"] = function(msg) {
    var nodeId = msg[1]|0;
    var tag    = msg[2];
    var n = node.get(nodeId);
    if (n) {
      n.emit("done", tag);
    }
  };
  
  var install = function() {
    var client = cc.client = new WorkerSynthClient();
    addEventListener("message", function(e) {
      var msg = e.data;
      if (msg instanceof Float32Array) {
        msg[C.USER_ID] = client.userId;
        client.sendToServer(msg);
      } else {
        client.recvFromIF(msg);
      }
    });
    if (typeof global.console === "undefined") {
      global.console = (function() {
        var console = {};
        ["log", "debug", "info", "warn", "error"].forEach(function(method) {
          console[method] = function() {
            var args = Array.prototype.slice.call(arguments).map(function(x) {
              return pack(x);
            });
            client.sendToIF(["/console/" + method, args]);
          };
        });
        return console;
      })();
    }
  };
  
  module.exports = {
    install: install
  };

});
