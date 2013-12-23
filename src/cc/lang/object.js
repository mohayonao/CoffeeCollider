define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");
  
  fn.defineProperty(cc.Object.prototype, "clone", fn(function() {
    return this;
  }).defaults(ops.COMMONS.clone).build());
  
  fn.defineProperty(cc.Object.prototype, "dup", fn(function(n, deep) {
    var a = new Array(n|0);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = this.clone(deep);
    }
    return a;
  }).defaults(ops.COMMONS.dup).build());
  
  fn.defineProperty(cc.Object.prototype, "value", function() {
    return this;
  });
  
  fn.defineProperty(cc.Object.prototype, "valueArray", function() {
    return this;
  });
  
  fn.defineProperty(cc.Object.prototype, "do", function(func) {
    if (cc.instanceOfSyncBlock(func)) {
      if (cc.currentSyncBlockHandler) {
        cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsOnce(this));
        return this;
      }
    }
    func(this, 0);
    return this;
  });
  
  fn.defineProperty(cc.Object.prototype, "asUGenInput", function() {
    throw new Error(this.klassName + " can't cast to a UGen.");
  });
  
  fn.defineProperty(cc.Object.prototype, "asString", function() {
    return this.klassName;
  });
  
  module.exports = {};

});
