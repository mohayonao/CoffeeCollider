define(function(require, exports, module) {
  "use strict";

  var fn = require("../fn");
  var UGen = require("./ugen").UGen;

  var MouseX = (function() {
    function MouseX() {
      UGen.call(this);
      this.klassName = "MouseX";
    }
    fn.extend(MouseX, UGen);

    MouseX.prototype.$kr = fn(function(minval, maxval, warp, lag) {
      if (warp === "exponential") {
        warp = 1;
      } else if (typeof warp !== "number") {
        warp = 0;
      }
      return this.multiNew(C.CONTROL, minval, maxval, warp, lag);
    }).defaults("minval=0,maxval=1,warp=0,lag=0.2").build();
    
    fn.classmethod(MouseX);
    
    return MouseX;
  })();
  
  var MouseY = (function() {
    function MouseY() {
      UGen.call(this);
      this.klassName = "MouseY";
    }
    fn.extend(MouseY, UGen);

    MouseY.prototype.$kr = fn(function(minval, maxval, warp, lag) {
      if (warp === "exponential") {
        warp = 1;
      } else if (typeof warp !== "number") {
        warp = 0;
      }
      return this.multiNew(C.CONTROL, minval, maxval, warp, lag);
    }).defaults("minval=0,maxval=1,warp=0,lag=0.2").build();
    
    fn.classmethod(MouseY);
    
    return MouseY;
  })();
  
  var MouseButton = (function() {
    function MouseButton() {
      UGen.call(this);
      this.klassName = "MouseButton";
    }
    fn.extend(MouseButton, UGen);

    MouseButton.prototype.$kr = fn(function(minval, maxval, lag) {
      return this.multiNew(C.CONTROL, minval, maxval, lag);
    }).defaults("minval=0,maxval=1,lag=0.2").build();
    
    fn.classmethod(MouseButton);
    
    return MouseButton;
  })();
  
  var install = function(namespace) {
    namespace.MouseX = MouseX;
    namespace.MouseY = MouseY;
    namespace.MouseButton = MouseButton;
  };

  module.exports = {
    install: install
  };

});
