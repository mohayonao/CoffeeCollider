define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientWorkerImpl = (function() {
    function SynthClientWorkerImpl(exports, opts) {
      cc.opmode = "worker";
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      var that = this;
      this.lang = cc.createWebWorker(cc.coffeeColliderPath);
      this.lang.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
    }
    extend(SynthClientWorkerImpl, cc.SynthClientImpl);
    
    return SynthClientWorkerImpl;
  })();
  
  cc.createSynthClientWorkerImpl = function(exports, opts) {
    return new SynthClientWorkerImpl(exports, opts);
  };
  
  module.exports = {};

});
