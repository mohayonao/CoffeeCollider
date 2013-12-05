define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils = require("./utils");
  var asRate = utils.asRate;
  
  var mix = function(array) {
    if (!Array.isArray(array)) {
      array = [array];
    }
    var reduceArray = utils.clump(array, 4);
    var a = reduceArray.map(function(a) {
      switch (a.length) {
      case 4:
        return cc.createSum4(a[0], a[1], a[2], a[3]);
      case 3:
        return cc.createSum3(a[0], a[1], a[2]);
      case 2:
        return cc.createBinaryOpUGen("+", a[0], a[1]);
      case 1:
        return a[0];
      }
    });
    switch (a.length) {
    case 4:
      return cc.createSum4(a[0], a[1], a[2], a[3]);
    case 3:
      return cc.createSum3(a[0], a[1], a[2]);
    case 2:
      return cc.createBinaryOpUGen("+", a[0], a[1]);
    case 1:
      return a[0];
    default:
      return mix(a);
    }
  };
  
  cc.global.Mix = function(array) {
    return mix(array) || [];
  };
  cc.global.Mix.fill = function(n, func) {
    n = n|0;
    var array = new Array(n);
    for (var i = 0; i < n; ++i) {
      array[i] = func(i);
    }
    return mix(array);
  };
  cc.global.Mix.ar = function(array) {
    if (Array.isArray(array)) {
      var result = array.slice();
      switch (asRate(result)) {
      case C.AUDIO:
        return result;
      case C.CONTROL:
        return result.map(function(x) {
          return cc.global.K2A.ar(x);
        });
      case C.SCALAR:
        return result.map(function(x) {
          return cc.global.DC.ar(x);
        });
      }
    }
    throw "Mix.ar: bad arguments";
  };
  cc.global.Mix.kr = function(array) {
    if (Array.isArray(array)) {
      var result = array.slice();
      var rate = asRate(result);
      if (rate === C.AUDIO) {
        result = result.map(function(x) {
          if (x.rate === C.AUDIO) {
            return cc.global.A2K.kr(x);
          }
          return x;
        });
        rate = asRate(result);
      }
      switch (rate) {
      case C.CONTROL:
        return result;
      case C.SCALAR:
        return result.map(function(x) {
          return cc.global.DC.ar(x);
        });
      }
    }
    throw "Mix.kr: bad arguments";
  };

  cc.global.Mix.arFill = function(n, func) {
    n = Math.max(0, n)|0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = func(i);
    }
    return cc.global.Mix.ar(a);
  };

  cc.global.Mix.krFill = function(n, func) {
    n = Math.max(0, n)|0;
    var a = new Array(n);
    for (var i = 0; i < n; ++i) {
      a[i] = func(i);
    }
    return cc.global.Mix.kr(a);
  };
  
  module.exports = {};

});
