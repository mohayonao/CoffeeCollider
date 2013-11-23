define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  var onmessage = require("./utils").lang_onmessage;
  
  var WorkerSynthLang = (function() {
    function WorkerSynthLang() {
      cc.opmode = "worker";
      
      cc.SynthLang.call(this);
      this.sampleRate = C.WORKER_SAMPLERATE;
      this.channels   = C.WORKER_CHANNELS;
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
    }
    extend(WorkerSynthLang, cc.SynthLang);
    
    WorkerSynthLang.prototype.sendToClient = function(msg) {
      postMessage(msg);
    };
    WorkerSynthLang.prototype.process = function() {
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return WorkerSynthLang;
  })();

  cc.createWorkerSynthLang = function() {
    var lang = new WorkerSynthLang();
    global.onmessage = onmessage;
    return lang;
  };
  
  module.exports = {};

});
