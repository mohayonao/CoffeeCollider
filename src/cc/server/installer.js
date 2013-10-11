define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    namespace = namespace || {};
    namespace.register = function(name) {
      if (!/^__.*__$/.test(name)) {
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
    require("./server").install(namespace);
    require("./array").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
    require("./ugen/installer").install(namespace);
    delete namespace.register;
  };

  module.exports = {
    install: install
  };

});
