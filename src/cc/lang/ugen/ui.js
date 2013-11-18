define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  var MouseXY = {
    $kr: {
      defaults: "minval=0,maxval=1,warp=0,lag=0.2",
      ctor: function(minval, maxval, warp, lag) {
        if (warp === "exponential") {
          warp = 1;
        } else if (typeof warp !== "number") {
          warp = 0;
        }
        return this.init(C.CONTROL, minval, maxval, warp, lag);
      }
    }
  };
  cc.ugen.specs.MouseX = MouseXY;
  cc.ugen.specs.MouseY = MouseXY;
  
  cc.ugen.specs.MouseButton = {
    $kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.init(C.CONTROL, minval, maxval, lag);
      }
    }
  };
  
  module.exports = {};

});
