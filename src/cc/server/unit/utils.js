define(function(require, exports, module) {
  "use strict";
  
  var zapgremlins = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = 0;
      }
    } else if (a < +1e-6) {
      a = 0;
    }
    return a;
  };
  
  var avoidzero = function(a) {
    if (a < 0) {
      if (-1e-6 < a) {
        a = -1e-6;
      }
    } else if (a < +1e-6) {
      a = 1e-6;
    }
    return a;
  };
  
  var cubicinterp = function(x, y0, y1, y2, y3) {
    var c0 = y1;
    var c1 = 0.5 * (y2 - y0);
    var c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    var c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * x + c2) * x + c1) * x + c0;
  };
  
  module.exports = {
    zapgremlins: zapgremlins,
    avoidzero  : avoidzero,
    cubicinterp: cubicinterp,
  };

});
