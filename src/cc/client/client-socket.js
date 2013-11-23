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
      this.lang = cc.createWebWorker(cc.coffeeColliderPath + "#socket");
      this.lang.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
      
      exports.socket = {
        open: function() {
          that.sendToLang([ "/socket/open", opts.socket ]);
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
  
  cc.createSynthClientSocketImpl = function(exports, opts) {
    return new SynthClientSocketImpl(exports, opts);
  };
  
  module.exports = {};
  
});
