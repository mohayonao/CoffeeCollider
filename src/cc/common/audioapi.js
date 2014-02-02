define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  require("./audioapi-webaudio");
  require("./audioapi-flashfallback");
  require("./audioapi-nodeaudio");

  cc.createAudioAPI = function(sys, opts) {
    return cc.createWebAudioAPI(sys, opts) ||
      cc.createFlashAudioAPI(sys, opts) ||
      cc.createNodeAudioAPI(sys, opts);
  };
  
  module.exports = {};

});
