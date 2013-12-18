define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var emitter = require("../common/emitter");
  var slice   = [].slice;
  
  cc.global.Message = {
    klassName: "Message"
  };
  
  emitter.mixin(cc.global.Message);
  
  cc.global.Message.send = function() {
    cc.lang.sendToClient([
      "/send", slice.call(arguments)
    ]);
    return cc.global.Message;
  };
  
  module.exports = {};

});
