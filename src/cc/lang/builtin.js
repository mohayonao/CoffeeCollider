define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var pack  = require("../common/pack").pack;
  var slice = [].slice;

  cc.global.console = {};
  
  cc.global.console.log = function() {
    if (cc.lang) {
      cc.lang.sendToClient(["/console/log", slice.call(arguments).map(pack)]);
    }
  };
  
  
  var timerIdCache = [];
  cc.global.setInterval = function(func, delay) {
    var id = setInterval(func, delay);
    timerIdCache.push(id);
    return id;
  };

  cc.global.setTimeout = function(func, delay) {
    var id = setTimeout(func, delay);
    timerIdCache.push(id);
    return id;
  };

  cc.global.clearInterval = function(id) {
    clearInterval(id);
    var index = timerIdCache.indexOf(id);
    if (index !== -1) {
      timerIdCache.splice(index, 1);
    }
  };

  cc.global.clearTimeout = function(id) {
    clearTimeout(id);
    var index = timerIdCache.indexOf(id);
    if (index !== -1) {
      timerIdCache.splice(index, 1);
    }
  };

  cc.resetBuiltin = function() {
    timerIdCache.splice(0).forEach(function(timerId) {
      clearInterval(timerId);
      clearTimeout(timerId);
    });
  };
  
  module.exports = {};

});
