define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  module.exports = {
    use: function() {
      cc.createWebWorker = function(path) {
        return new Worker(path);
      };
      cc.createWebSocket = function(path) {
        return new WebSocket(path);
      };
      cc.createXMLHttpRequest = function() {
        return new XMLHttpRequest();
      };
      cc.createMessageChannel = function() {
        return new MessageChannel();
      };
      cc.createHTMLIFrameElement = function() {
        var iframe = document.createElement("iframe");
        iframe.style.width  = 0;
        iframe.style.height = 0;
        iframe.style.border = 0;
        document.body.appendChild(iframe);
        return iframe;
      };
    }
  };

  module.exports.use();

});
