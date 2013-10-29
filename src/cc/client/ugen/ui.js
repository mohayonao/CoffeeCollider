define(function(require, exports, module) {
  "use strict";
  
  var ugen = require("./ugen");
  
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
  
  module.exports = {
    exports: function() {
      ugen.register("MouseX", iMouseXY);
      ugen.register("MouseY", iMouseXY);
      ugen.register("MouseButton", iMouseButton);
    }
  };

});
