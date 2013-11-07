define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  cc.Object.prototype.__and__ = function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  };
  
  cc.Object.prototype.__or__ = function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  };
  
  module.exports = {};

});
