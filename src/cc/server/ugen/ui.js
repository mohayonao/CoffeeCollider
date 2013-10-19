define(function(require, exports, module) {
  "use strict";
  
  var ugen = require("./ugen");
  
  var MouseX = {
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
  var MouseY = {
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
  var MouseButton = {
    kr: {
      defaults: "minval=0,maxval=1,lag=0.2",
      ctor: function(minval, maxval, lag) {
        return this.init(C.CONTROL, minval, maxval, lag);
      }
    }
  };
  
  var install = function() {
    ugen.register("MouseX", MouseX);
    ugen.register("MouseY", MouseY);
    ugen.register("MouseButton", MouseButton);
  };
  
  module.exports = {
    install: install
  };

});
