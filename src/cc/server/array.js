define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var impl = require("./array.impl");

  var zip = impl.zip;
  
  var flatten = fn(function(list, level) {
    if (!Array.isArray(list)) {
      return [list];
    }
    return impl.flatten(list, level, []);
  }).defaults("list,level=Infinity").build();
  
  var clump = fn(function(list, groupSize) {
    if (!Array.isArray(list)) {
      return [list];
    }
    return impl.clump(list, groupSize);
  }).defaults("list,groupSize=2").build();
  
  var install = function(namespace) {
    Array.prototype.zip = function() {
      return zip.apply(null, this);
    };
    Array.prototype.flatten = fn(function(level) {
      return impl.flatten(this, level, []);
    }).defaults("level=Infinity").build();
    Array.prototype.clump = fn(function(groupSize) {
      return impl.clump(this, groupSize);
    }).defaults("groupSize=2").build();

    Array.prototype.toString = function() {
      return "[ " + this.map(function(x) {
        return x.toString();
      }).join(", ") + " ]";
    };
    
    if (namespace) {
      namespace.zip     = zip;
      namespace.flatten = flatten;
      namespace.clump   = clump;
    }
  };

  module.exports = {
    install: install,
    zip    : zip,
    flatten: flatten,
    clump  : clump,
  };

});
