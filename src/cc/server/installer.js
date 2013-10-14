define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = register(namespace);
    require("./server").install(namespace);
    require("./array").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    require("./node").install(namespace);
    require("./ugen/installer").install(namespace);
    require("./unit/installer").install(namespace);
    delete namespace.register;
  };

  var register = function(namespace) {
    return function(name, func) {
      if (func) {
        if (/^[A-Z]/.test(name)) {
          var Klass = func;
          var base = namespace[name] = function() {
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
          namespace[name] = func;
        }
      } else if (!/^__.*__$/.test(name)) {
        namespace[name] = function(recv) {
          if (recv !== null && recv !== undefined) {
            var func = recv[name];
            if (typeof func === "function") {
              return func.apply(recv, Array.prototype.slice.call(arguments, 1));
            } else {
              return func;
            }
          }
          return 0;
        };
      }
    };
  };

  module.exports = {
    install : install,
    register: register
  };

});
