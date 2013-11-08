define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientSocketImpl = (function() {
    function SynthClientSocketImpl(exports, opts) {
      cc.opmode = "socket";
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      var iframe = this.iframe = cc.createHTMLIFrameElement();
      iframe.sandbox = "allow-scripts";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#socket'></script>";
      var channel = cc.createMessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(opts.socket, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
      this.lang = channel.port1;
      
      exports.socket = {
        open: function() {
          that.sendToLang([ "/socket/open" ]);
        },
        close: function() {
          that.sendToLang([ "/socket/close" ]);
        },
        send: function(msg) {
          that.sendToLang([ "/socket/sendToServer", msg ]);
        }
      };
    }
    extend(SynthClientSocketImpl, cc.SynthClientImpl);
    
    return SynthClientSocketImpl;
  })();
  
  module.exports = {
    use: function() {
      cc.createSynthClientSocketImpl = function(exports, opts) {
        return new SynthClientSocketImpl(exports, opts);
      };
    }
  };
  
  module.exports.use();
  
});
