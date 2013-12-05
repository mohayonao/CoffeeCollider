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
      this.instanceManager.play(userId);
      if (this.api) {
        this._strm = new Int16Array(this.strmLength * this.channels);
        this.strmList = new Array(C.STRM_LIST_LENGTH);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        var strmList = this.strmList;
        for (var i = strmList.length; i--; ) {
          strmList[i] = new Int16Array(this._strm);
        }
        if (!this.api.isPlaying) {
          this.api.play();
        }
      }
      if (!this.timer.isRunning()) {
        this.timer.start(this.process.bind(this), C.PROCESSING_INTERVAL);
      }
    };
    NodeJSSynthServer.prototype.pause = function(msg, userId) {
      userId = userId|0;
      this.instanceManager.pause(userId);
      if (this.api) {
        if (this.api.isPlaying) {
          if (!this.instanceManager.isRunning()) {
            this.api.pause();
          }
        }
      }
      if (this.timer.isRunning()) {
        if (!this.instanceManager.isRunning()) {
          this.timer.stop();
        }
      }
    };
    NodeJSSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount[0] - C.STRM_FORWARD_PROCESSING) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var lang = cc.lang;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        lang.process();
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.syncCount[0] += 1;
      if (this.api) {
        this.strmList[this.strmListWriteIndex] = new Int16Array(strm);
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & C.STRM_LIST_MASK;
      }
    };
    NodeJSSynthServer.prototype._process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & C.STRM_LIST_MASK;
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
