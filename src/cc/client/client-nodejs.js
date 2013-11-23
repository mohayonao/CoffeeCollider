define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");
  
  var SynthClientNodeJSImpl = (function() {
    function SynthClientNodeJSImpl(exports, opts) {
      cc.opmode = "nodejs";
      this.strmLength = C.NODEJS_STRM_LENGTH;
      this.bufLength  = C.NODEJS_BUF_LENGTH;
      
      cc.SynthClientImpl.call(this, exports, opts);
      
      this.api = null;
    }
    extend(SynthClientNodeJSImpl, cc.SynthClientImpl);
    
    return SynthClientNodeJSImpl;
  })();
  
  cc.createSynthClientNodeJSImpl = function(exports, opts) {
    return new SynthClientNodeJSImpl(exports, opts);
  };
  
  module.exports = {};

});
