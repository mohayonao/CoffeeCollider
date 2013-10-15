define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  
  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = register(namespace);
    require("./server").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    require("./node").install(namespace);
    require("./sched").install(namespace);
    require("./ugen/installer").install(namespace);
    require("./unit/installer").install(namespace);
    delete namespace.register;
  };

  var installed = cc.installed = {};

  var register = function(namespace) {
    return function(name, func) {
      if (func) {
        if (/^[A-Z]/.test(name)) {
          var Klass = func;
          var base = namespace[name] = installed[name] = function() {
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
          namespace[name] = installed[name] = func;
        }
      }
    };
  };
  
  module.exports = {
    install : install,
    register: register
    };

});
