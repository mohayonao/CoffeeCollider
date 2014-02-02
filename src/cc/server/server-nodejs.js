define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var NodeJSSynthServer = (function() {
    function NodeJSSynthServer() {
      require("../common/audioapi");
      
      cc.SynthServer.call(this);
      
      this.sampleRate = C.NODEJS_SAMPLERATE;
      this.channels   = C.NODEJS_CHANNELS;
      this.strmLength = C.NODEJS_STRM_LENGTH;
      this.bufLength  = C.NODEJS_BUF_LENGTH;
    }
    extend(NodeJSSynthServer, cc.SynthServer);
    
    NodeJSSynthServer.prototype.init = function() {
      if (!this.initialized) {
        cc.SynthServer.prototype.init.call(this);
        this.api = cc.createAudioAPI(this);
      }
    };
    NodeJSSynthServer.prototype.connect = function() {
      this.sendToLang([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    NodeJSSynthServer.prototype.play = function(msg, userId) {
      userId = userId|0;
      this.world.run(true, userId);
      if (this.api) {
        this._strm = new Float32Array(this.strmLength * this.channels);
        this.strmList = new Array(C.STRM_LIST_LENGTH);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        var strmList = this.strmList;
        for (var i = strmList.length; i--; ) {
          strmList[i] = new Float32Array(this._strm);
        }
        if (!this.api.isPlaying) {
          this.api.play();
        }
      }
      if (!this.timer.isRunning()) {
        var that = this;
        setTimeout(function() {
          that.timer.start(function() { that.process(); }, C.PROCESSING_INTERVAL);
        }, 50); // TODO: ???
      }
    };
    NodeJSSynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.world.run(false, userId);
      if (this.api) {
        if (this.api.isPlaying) {
          if (!this.world.isRunning()) {
            this.api.pause();
          }
        }
      }
      if (this.timer.isRunning()) {
        if (!this.world.isRunning()) {
          this.timer.stop();
        }
      }
    };
    NodeJSSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount - C.STRM_FORWARD_PROCESSING) {
        return;
      }
      var strm = this.strm;
      var world = this.world;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOut  = this.busOut;
      var busOutL = this.busOutL;
      var busOutR = this.busOutR;
      var lang = cc.lang;
      var offsetL = 0;
      var offsetR = strmLength;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        world.process(bufLength);
        busOut.set(world.bus);
        strm.set(busOutL, offsetL);
        strm.set(busOutR, offsetR);
        offsetL += bufLength;
        offsetR += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount += 1;
      if (this.api) {
        this.strmList[this.strmListWriteIndex & C.STRM_LIST_MASK] = new Float32Array(strm);
        this.strmListWriteIndex += 1;
      }
    };
    NodeJSSynthServer.prototype._process = function() {
      var strm = this.strmList[this.strmListReadIndex & C.STRM_LIST_MASK];
      if (strm) {
        this.strmListReadIndex += 1;
        this._strm.set(strm);
      }
      this.sysSyncCount += 1;
    };
    
    return NodeJSSynthServer;
  })();
  
  cc.NodeJSSynthServer = NodeJSSynthServer;
  cc.createNodeJSSynthServer = function() {
    var server = new NodeJSSynthServer();
    cc.opmode = "nodejs";
    return server;
  };
  
  module.exports = {};

});
