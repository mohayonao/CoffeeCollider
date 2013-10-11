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

  var flatten = function(that, level, list) {
    for (var i = 0, imax = that.length; i < imax; ++i) {
      if (level <= 0 || !Array.isArray(that[i])) {
        list.push(that[i]);
      } else {
        list = flatten(that[i], level - 1, list);
      }
    }
    return list;
  };

  var clump = function(list, groupSize) {
    var result  = [];
    var sublist = [];
    for (var i = 0, imax = list.length; i < imax; ++i) {
      sublist.push(list[i]);
      if (sublist.length >= groupSize) {
        result.push(sublist);
        sublist = [];
      }
    }
    if (sublist.length > 0) {
      result.push(sublist);
    }
    return result;
  };
  
  module.exports = {
    zip    : zip,
    flatten: flatten,
    clump  : clump,
  };

});
