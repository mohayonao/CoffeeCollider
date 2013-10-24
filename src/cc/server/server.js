define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var Userspace = require("./userspace").Userspace;
  var commands  = {};
  
  var SynthServer = (function() {
    function SynthServer() {
      this.sampleRate = 44100;
      this.channels   = 2;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.userspace = new Userspace();
      this.processed = 0;
      this.processStart    = 0;
      this.processInterval = 0;
    }
    SynthServer.prototype.sendToClient = function() {
      // should be overridden
    };
    SynthServer.prototype.recvFromClient = function(msg) {
      if (msg instanceof Float32Array) {
        this.userspace.setSyncItems(msg[0], msg);
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthServer.prototype.connect = function() {
      // should be overridden
    };
    SynthServer.prototype.init = function() {
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.rates = {};
      this.rates[C.AUDIO  ] = new Rate(this.sampleRate, this.bufLength);
      this.rates[C.CONTROL] = new Rate(this.sampleRate / this.bufLength, 1);
      var busLength  = this.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      var busBuffer  = new Float32Array(busLength);
      var bufLength  = this.bufLength;
      var bufLength4 = this.bufLength << 2;
      this.busBuffer = busBuffer;
      this.busClear  = new Float32Array(busLength);
      this.busOutL   = new Float32Array(busBuffer.buffer, 0         , bufLength);
      this.busOutR   = new Float32Array(busBuffer.buffer, bufLength4, bufLength);
    };
    SynthServer.prototype.getRate = function(rate) {
      return this.rates[rate] || this.rates[C.CONTROL];
    };
    SynthServer.prototype.process = function() {
      // var strm = this.strm;
      // var strmLength = this.strmLength;
      // var root = this.rootNode;
      // var bufLength = this.bufLength;
      // var offset = 0;
      // var busBuffer = this.busBuffer;
      // var busClear  = this.busClear;
      // var busOutL  = this.busOutL;
      // var busOutR  = this.busOutR;
      // var timeline = this.timeline;
      // var n = strmLength / bufLength;
      // while (n--) {
      //   timeline.process();
      //   busBuffer.set(busClear);
      //   root.process(bufLength);
      //   strm.set(busOutL, offset);
      //   strm.set(busOutR, offset + strmLength);
      //   offset += bufLength;
      // }
      // this.sendToClient(strm);
    };
    return SynthServer;
  })();
  
  var WorkerSynthServer = (function() {
    function WorkerSynthServer() {
      SynthServer.call(this);
      this.offset = 0;
    }
    fn.extend(WorkerSynthServer, SynthServer);
    SynthServer.prototype.connect = function() {
      this.userspace.append(0);
      this.sendToClient([
        "/connect", this.sampleRate, this.channels, this.strmLength, this.bufLength
      ]);
    };
    SynthServer.prototype.preprocess = function() {
      this.offset = 0;
    };
    SynthServer.prototype.process = function() {
      this.busBuffer.set(this.busClear);
      this.userspace.process(this.bufLength);
      this.strm.set(this.busOutL, this.offset);
      this.strm.set(this.busOutR, this.offset + this.strmLength);
      this.offset += this.bufLength;
    };
    SynthServer.prototype.postprocess = function() {
      this.sendToClient(this.strm);
    };
    
    return WorkerSynthServer;
  })();
  
  commands["/init"] = function(msg) {
    this.sampleRate = msg[1]|0;
    this.channels   = msg[2]|0;
    this.strmLength = msg[3]|0;
    this.bufLength  = msg[4]|0;
    this.init(msg);
  };
  commands["/play"] = function(msg) {
    var userId = msg[1]|0;
    this.userspace.play(userId);
  };
  commands["/pause"] = function(msg) {
    var userId = msg[1]|0;
    this.userspace.pause(userId);
  };
  commands["/reset"] = function(msg) {
    var userId = msg[1]|0;
    this.userspace.reset(userId);
  };
  commands["/command"] = function(msg) {
    var userId   = msg[1]|0;
    var timeline = msg[2];
    this.userspace.setTimeline(userId, timeline);
  };
  
  var Rate = (function() {
    var twopi = 2 * Math.PI;
    function Rate(sampleRate, bufLength) {
      this.sampleRate = sampleRate;
      this.sampleDur  = 1 / sampleRate;
      this.radiansPerSample = twopi / sampleRate;
      this.bufLength   = bufLength;
      this.bufDuration = bufLength / sampleRate;
      this.bufRate = 1 / this.bufDuration;
      this.slopeFactor = 1 / bufLength;
      this.filterLoops  = (bufLength / 3)|0;
      this.filterRemain = (bufLength % 3)|0;
      if (this.filterLoops === 0) {
        this.filterSlope = 0;
      } else {
        this.filterSlope = 1 / this.filterLoops;
      }
    }
    return Rate;
  })();
  
  var install = function() {
    cc.server = new WorkerSynthServer();
  };

  module.exports = {
    install: install
  };

});
