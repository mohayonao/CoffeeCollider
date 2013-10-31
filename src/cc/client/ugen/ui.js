define(function(require, exports, module) {
  "use strict";
  
  var cc = require("../cc");
  
  var iMouseXY = {
    kr: {
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
  var iMouseButton = {
    kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.init(C.CONTROL, minval, maxval, lag);
      }
    }
  };

  var use = function() {
  };
  
  module.exports = {
    use:use,
    exports: function() {
      cc.registerUGen("MouseX", iMouseXY);
      cc.registerUGen("MouseY", iMouseXY);
      cc.registerUGen("MouseButton", iMouseButton);
    }
  };

});
