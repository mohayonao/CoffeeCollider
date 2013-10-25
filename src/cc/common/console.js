define(function(require, exports, module) {
  "use strict";
  
  var unpack = require("./pack").unpack;
  
  var receive = function(commands) {
    commands["/console/log"] = function(msg) {
      console.log.apply(console, unpack(msg[1]));
    };
    commands["/console/debug"] = function(msg) {
      console.debug.apply(console, unpack(msg[1]));
    };
    commands["/console/info"] = function(msg) {
      console.info.apply(console, unpack(msg[1]));
    };
    commands["/console/warn"] = function(msg) {
      console.warn.apply(console, unpack(msg[1]));
    };
    commands["/console/error"] = function(msg) {
      console.error.apply(console, unpack(msg[1]));
    };
  };
  
  module.exports = {
    receive: receive
  };

});
