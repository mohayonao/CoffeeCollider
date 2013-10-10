define(function(require, exports, module) {
  "use strict";

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
  
  var install = function(namespace) {
    Array.prototype.zip = function() {
      return zip.apply(null, this);
    };
    if (namespace) {
      namespace.zip = zip;
    }
  };

  module.exports = {
    install: install,
    zip: zip,
  };

});
