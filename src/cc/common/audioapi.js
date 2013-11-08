define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  require("./audioapi-webaudio");
  require("./audioapi-audiodata");
  require("./audioapi-flashfallback");
  require("./audioapi-nodeaudio");
  
  module.exports = {
    use: function() {
      cc.createAudioAPI = function(sys, opts) {
        return cc.createWebAudioAPI(sys, opts) ||
          cc.createAudioDataAPI(sys, opts) ||
          cc.createFlashAudioAPI(sys, opts) ||
          cc.createNodeAudioAPI(sys, opts);
      };
    }
  };
  
  module.exports.use();

});
