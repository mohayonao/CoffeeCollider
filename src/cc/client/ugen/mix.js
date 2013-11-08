define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var utils = require("../utils");
  
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
  cc.global.Mix.ar = function() {
  };
  
  module.exports = {};

});
