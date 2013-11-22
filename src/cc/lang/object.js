define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  
  cc.Object.prototype.__and__ = function(b) {
    return cc.createTaskWaitLogic("and", [this].concat(b));
  };
  
  cc.Object.prototype.__or__ = function(b) {
    return cc.createTaskWaitLogic("or", [this].concat(b));
  };
  
  fn.defineProperty(cc.Object.prototype, "dup", fn(function(n) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this;
    }
    return a;
  }).defaults("n=2").build());
  
  module.exports = {};

});
