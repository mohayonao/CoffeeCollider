define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.createWebWorker = function(path) {
    return new Worker(path);
  };
  cc.createWebSocket = function(path) {
    return new WebSocket(path);
  };
  cc.createXMLHttpRequest = function() {
    return new XMLHttpRequest();
  };
  
  module.exports = {};

});
