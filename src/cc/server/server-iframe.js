define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var IFrameSynthServer = (function() {
    function IFrameSynthServer() {
      cc.SynthServer.call(this);
      
      this.sampleRate = C.IFRAME_SAMPLERATE;
      this.channels   = C.IFRAME_CHANNELS;
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
    }
    extend(IFrameSynthServer, cc.SynthServer);
    
    IFrameSynthServer.prototype.sendToLang = function(msg) {
      postMessage(msg);
    };
    IFrameSynthServer.prototype.connect = function() {
      this.sendToLang([
        "/connected", this.sampleRate, this.channels
      ]);
    };
    IFrameSynthServer.prototype.process = function() {
      if (this.sysSyncCount < this.syncCount[0] - 4) {
        return;
      }
      var strm = this.strm;
      var instanceManager = this.instanceManager;
      var strmLength = this.strmLength;
      var bufLength  = this.bufLength;
      var busOutL = instanceManager.busOutL;
      var busOutR = instanceManager.busOutR;
      var offset = 0;
      for (var i = 0, imax = strmLength / bufLength; i < imax; ++i) {
        instanceManager.process(bufLength);
        var j = bufLength, k = strmLength + bufLength;
        while (k--, j--) {
          strm[j + offset] = Math.max(-32768, Math.min(busOutL[j] * 32768, 32767));
          strm[k + offset] = Math.max(-32768, Math.min(busOutR[j] * 32768, 32767));
        }
        offset += bufLength;
      }
      this.sendToLang(strm);
      this.sendToLang(["/process"]);
      this.syncCount += 1;
    };
    
    return IFrameSynthServer;
  })();
  
  module.exports = {
    use: function() {
      cc.createIFrameSynthServer = function() {
        var server = new IFrameSynthServer();
        global.onmessage = function(e) {
          server.recvFromLang(e.data, 0);
        };
        cc.opmode = "iframe";
        return server;
      };
    }
  };
  
  module.exports.use();

});
