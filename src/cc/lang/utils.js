define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  var isDict = function(obj) {
    return !!(obj && obj.constructor === Object);
  };
  
  var flop = function(list) {
    var maxSize = list.reduce(function(len, sublist) {
      return Math.max(len, Array.isArray(sublist) ? sublist.length : 1);
    }, 0);
    var result = new Array(maxSize);
    var length = list.length;
    if (length) {
      for (var i = 0; i < maxSize; ++i) {
        var sublist = result[i] = new Array(length);
        for (var j = 0; j < length; ++j) {
          sublist[j] = Array.isArray(list[j]) ? list[j][i % list[j].length] : list[j];
        }
      }
    }
    return result;
  };
  
  var flatten = (function() {
    var _flatten = function(list, result) {
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (Array.isArray(list[i])) {
          result = _flatten(list[i], result);
        } else {
          result.push(list[i]);
        }
      }
      return result;
    };
    return function(list) {
      return _flatten(list, []);
    };
  })();

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
    if (sublist.length) {
      result.push(sublist);
    }
    return result;
  };
  
  var wrapExtend = function(list, size) {
    if (size < list.length) {
      return list.slice(0, size);
    }
    var a = new Array(size);
    for (var i = 0; i < size; ++i) {
      a[i] = list[i % list.length];
    }
    return a;
  };
  
  var lang_onmessage = function(e) {
    var msg = e.data;
    if (msg instanceof Uint8Array) {
      cc.lang.sendToServer(msg);
    } else {
      cc.lang.recvFromClient(msg);
    }
  };
  
  module.exports = {
    isDict : isDict,
    flop   : flop,
    flatten: flatten,
    clump  : clump,
    wrapExtend: wrapExtend,
    
    lang_onmessage: lang_onmessage
  };

});
