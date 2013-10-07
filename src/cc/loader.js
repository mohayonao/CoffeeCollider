define(function(require, exports, module) {
  "use strict";

  var cc = require("cc/cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        m = /^(.*\/coffee-script\.js)/.exec(scripts[i].src);
        if (m) {
          cc.coffeeScriptPath = m[1];
        } else {
          m = /^(.*\/coffee-collider(?:-min)?\.js)(#lang)?/.exec(scripts[i].src);
          if (m) {
            cc.coffeeColliderPath = m[1];
            if (m[2] === "#lang") {
              cc.isLangMode = true;
            }
          }
        }
      }
    }

    if (!cc.isLangMode) {
      global.CoffeeCollider = require("cc/front/coffee-collider").CoffeeCollider;
    } else {
      require("cc/lang/server");
    }
  }
  
  module.exports = {
  };

});
