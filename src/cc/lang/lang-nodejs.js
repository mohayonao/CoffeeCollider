define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var NodeJSSynthLang = (function() {
    function NodeJSSynthLang() {
      cc.opmode = "nodejs";
      
      cc.SynthLang.call(this);
      
      this.sampleRate = C.NODEJS_SAMPLERATE;
      this.channels   = C.NODEJS_CHANNELS;
      this.strmLength = C.NODEJS_STRM_LENGTH;
      this.bufLength  = C.NODEJS_BUF_LENGTH;
    }
    extend(NodeJSSynthLang, cc.SynthLang);

    NodeJSSynthLang.prototype.process = function() {
      this.currentTime += this.currentTimeIncr;
      this.taskManager.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return NodeJSSynthLang;
  })();

  cc.createNodeJSSynthLang = function() {
    var lang = new NodeJSSynthLang();
    return lang;
  };
  
  module.exports = {};

});
