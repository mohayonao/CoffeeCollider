define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    var scripts = document.getElementsByTagName("script");
    var langMode = false;
    if (scripts && scripts.length) {
      var m;
      for (var i = 0; i < scripts.length; i++) {
        if (!cc.coffeeColliderPath) {
          m = /^(.*\/coffee-collider(?:-min)?\.js)(#lang)?/.exec(scripts[i].src);
          if (m) {
            cc.coffeeColliderPath = m[1];
            if (m[2] === "#lang") {
              langMode = true;
            }
            break;
          }
        }
      }
    }

    if (!langMode) {
      cc.context = "window";
      global.CoffeeCollider = require("./front/coffee-collider").CoffeeCollider;
    } else {
      cc.context = "server";
      require("./lang/installer").install();
    }
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "synth";
    require("./synth/synth-server");
  }
  
  module.exports = {
  };

});
