define(function(require, exports, module) {
  "use strict";
  
  var install = function() {
    require("./server").install(register);
    require("./bop").install(register);
    require("./uop").install(register);
    require("./node").install(register);
    require("./sched").install(register);
    require("./ugen/installer").install(register);
    require("./unit/installer").install(register);
  };

  var register = function(name, func) {
    if (func) {
      if (/^[A-Z]/.test(name)) {
        var Klass = func;
        var base = global[name] = function() {
          return new Klass();
        };
        if (Klass.classmethods) {
          Object.keys(Klass.classmethods).forEach(function(key) {
            key = key.substr(1);
            if (Klass[key]) {
              base[key] = Klass[key];
            }
          });
        }
      } else {
        global[name] = func;
      }
    }
  };
  
  module.exports = {
    install : install,
    register: register
    };

});
