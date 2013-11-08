define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var unpack = require("./pack").unpack;
  
  var bind = function(commands) {
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
    bind: bind,
    use : function() {
      cc.console = {
        log: function() {
          global.console.log.apply(global.console, arguments);
        },
        info: function() {
          global.console.info.apply(global.console, arguments);
        },
        warn: function() {
          global.console.warn.apply(global.console, arguments);
        },
        error: function() {
          global.console.error.apply(global.console, arguments);
        }
      };
    }
  };

  module.exports.use();

});
