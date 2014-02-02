define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");

  var SynthClientWorkerImpl = (function() {
    function SynthClientWorkerImpl(client, opts) {
      cc.opmode = "worker";
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
      
      cc.SynthClientImpl.call(this, client, opts);
      
      var that = this;
      this.lang = cc.createWebWorker(cc.coffeeColliderPath);
      this.lang.onmessage = function(e) {
        that.recvFromLang(e.data);
      };
    }
    extend(SynthClientWorkerImpl, cc.SynthClientImpl);
    
    return SynthClientWorkerImpl;
  })();
  
  cc.createSynthClientWorkerImpl = function(client, opts) {
    return new SynthClientWorkerImpl(client, opts);
  };
  
  module.exports = {};

});
