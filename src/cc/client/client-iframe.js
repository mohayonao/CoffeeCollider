define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");
  
  var SynthClientIFrameImpl = (function() {
    function SynthClientIFrameImpl(exports, opts) {
      cc.opmode = "iframe";
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      var iframe = this.iframe = cc.createHTMLIFrameElement();
      // TODO: want to remove 'allow-same-origin'
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#iframe'></script>";
      var channel = cc.createMessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(null, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
      this.lang = channel.port1;
    }
    extend(SynthClientIFrameImpl, cc.SynthClientImpl);
    
    return SynthClientIFrameImpl;
  })();
  
  module.exports = {
    use: function() {
      cc.createSynthClientIFrameImpl = function(exports, opts) {
        return new SynthClientIFrameImpl(exports, opts);
      };
    }
  };

  module.exports.use();

});
