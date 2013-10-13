define(function(require, exports, module) {
  "use strict";
  
  var pack = (function() {
    var _ = function(data, stack) {
      if (!data) {
        return data;
      }
      if (stack.indexOf(data) !== -1) {
        return { klassName:"Circular" };
      }
      if (typeof data === "function") {
        return "[Function]";
      }
      var result;
      if (typeof data === "object") {
        if (data.buffer instanceof ArrayBuffer) {
          return data;
        }
        stack.push(data);
        if (Array.isArray(data)) {
          result = data.map(function(data) {
            return _(data, stack);
          });
        } else {
          result = {};
          Object.keys(data).forEach(function(key) {
            result[key] = _(data[key], stack);
          });
        }
        stack.pop();
      } else {
        result = data;
      }
      return result;
    };
    return function(data) {
      return _(data, []);
    };
  })();
  
  module.exports = {
    pack: pack
  };

});
