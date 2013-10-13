define(function(require, exports, module) {
  "use strict";

  var unpack = (function() {
    var func = function() {};
    var _ = function(data) {
      if (!data) {
        return data;
      }
      if (typeof data === "string") {
        if (data === "[Function]") {
          return func;
        }
        return data;
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        if (Array.isArray(data)) {
          result = data.map(function(data) {
            return _(data);
          });
        } else {
          if (data.klassName && /^[_a-z$][_a-z0-9$]*$/i.test(data.klassName)) {
            result = eval.call(null, "new (function " + data.klassName + "(){})");
            delete data.klassName;
          } else {
            result = {};
          }
          Object.keys(data).forEach(function(key) {
            result[key] = _(data[key]);
          });
        }
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _(data);
    };
  })();
  
  module.exports = {
    unpack: unpack
  };

});
