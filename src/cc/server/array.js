define(function(require, exports, module) {
  "use strict";

  var fn = require("./fn");
  var slice = [].slice;

  var zip = function() {
    var list = slice.call(arguments);
    var maxSize = list.reduce(function(len, sublist) {
      return Math.max(len, Array.isArray(sublist) ? sublist.length : 1);
    }, 0);
    var a   = new Array(maxSize);
    var len = list.length;
    if (len === 0) {
      a[0] = [];
    } else {
      for (var i = 0; i < maxSize; ++i) {
        var sublist = a[i] = new Array(len);
        for (var j = 0; j < len; ++j) {
          sublist[j] = Array.isArray(list[j]) ? list[j][i % list[j].length] : list[j];
        }
      }
    }
    return a;
  };

  var flatten = (function() {
    var _flatten = function(that, level, list) {
      for (var i = 0, imax = that.length; i < imax; ++i) {
        if (level <= 0 || !Array.isArray(that[i])) {
          list.push(that[i]);
        } else {
          list = _flatten(that[i], level - 1, list);
        }
      }
      return list;
    };
    return fn(function(list, level) {
      if (!Array.isArray(list)) {
        return [list];
      }
      return _flatten(list, level, []);
    }).defaults("list,level=Infinity").build();
  })();
  
  var install = function(namespace) {
    Array.prototype.zip = function() {
      return zip.apply(null, this);
    };
    Array.prototype.flatten = fn(function(level) {
      return flatten(this, level);
    }).defaults("level=Infinity").build();
    if (namespace) {
      namespace.zip     = zip;
      namespace.flatten = flatten;
    }
  };

  module.exports = {
    install: install,
    zip    : zip,
    flatten: flatten,
  };

});
