define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  var isDict = function(obj) {
    return !!(obj && obj.constructor === Object);
  };
  
  var asRate = function(obj) {
    if (Array.isArray(obj)) {
      return obj.reduce(function(rate, obj) {
        return Math.max(rate, asRate(obj));
      }, 0);
    }
    if (obj) {
      switch (obj.rate) {
      case C.SCALAR: case C.CONTROL: case C.AUDIO: case C.DEMAND:
        return obj.rate;
      }
    }
    return C.SCALAR;
  };

  var asRateString = function(obj) {
    switch (obj) {
    case C.SCALAR:  return "scalar";
    case C.CONTROL: return "control";
    case C.AUDIO:   return "audio";
    case C.DEMAND:  return "demand";
    }
    return "unknown";
  };
  
  var asNumber = function(obj) {
    obj = +obj;
    if (isNaN(obj)) {
      obj = 0;
    }
    return obj;
  };
  
  var asString = function(obj) {
    if (obj === "null") {
      return "null";
    } else if (obj === undefined) {
      return "undefined";
    } else if (obj.asString) {
      return obj.asString();
    }
    return obj.toString();
  };
  
  var asArray = function(obj) {
    if (obj === null || obj === undefined) {
      obj = [];
    } else if (!Array.isArray(obj)) {
      obj = [ obj ];
    }
    return obj;
  };
  
  var asUGenInput = function(obj) {
    if (obj === null || obj === undefined) {
      return 0;
    } else if (typeof obj.asUGenInput === "function") {
      return obj.asUGenInput();
    } else if (cc.instanceOfUGen(obj)) {
      return obj;
    } else if (Array.isArray(obj)) {
      return obj.map(asUGenInput);
    }
    obj = +obj;
    if (isNaN(obj)) {
      obj = 0;
    }
    return obj;
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

  var lace = function(list, length) {
    var a = new Array(length);
    var v, wrap = list.length;
    for (var i = 0; i < length; ++i) {
      v = list[i % wrap];
      a[i] = v[ ((i/wrap)|0) % v.length ] || 0;
    }
    return a;
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
    asRate      : asRate,
    asRateString: asRateString,
    asNumber    : asNumber,
    asString    : asString,
    asArray     : asArray,
    asUGenInput : asUGenInput,
    flop   : flop,
    flatten: flatten,
    clump  : clump,
    lace   : lace,
    wrapExtend: wrapExtend,
    
    lang_onmessage: lang_onmessage
  };

});
