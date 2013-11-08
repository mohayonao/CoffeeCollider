define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var IFrameSynthLang = (function() {
    function IFrameSynthLang() {
      cc.opmode = "iframe";
      require("../common/browser");
      
      cc.SynthLang.call(this);
      
      var that = this;
      this.sampleRate = C.IFRAME_SAMPLERATE;
      this.channels   = C.IFRAME_CHANNELS;
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
      this.server = cc.createWebWorker(cc.coffeeColliderPath);
      this.server.onmessage = function(e) {
        that.recvFromServer(e.data);
      };
    }
    extend(IFrameSynthLang, cc.SynthLang);
    
    IFrameSynthLang.prototype.sendToServer = function(msg) {
      this.server.postMessage(msg);
    };
    IFrameSynthLang.prototype.process = function() {
      var taskManager = this.taskManager;
      var n = this.strmLength / this.bufLength;
      var timelineResult = [];
      while (n--) {
        taskManager.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), C.DO_NOTHING
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };

    IFrameSynthLang.prototype.extendCommands = function(commands) {
      require("../common/console").bind(commands);
    };
    
    return IFrameSynthLang;
  })();

  module.exports = {
    use: function() {
      cc.createIFrameSynthLang = function() {
        var lang = new IFrameSynthLang();
        if (typeof window !== "undefined") {
          window.onmessage = function(e) {
            e.ports[0].onmessage = onmessage;
            lang.sendToClient = function(msg) {
              e.ports[0].postMessage(msg);
            };
            window.onmessage = null;
          };
        }
        return lang;
      };
    }
  };

  module.exports.use();

});
