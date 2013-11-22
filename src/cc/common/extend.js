define(function(require, exports, module) {
  "use strict";
  
  var extend = function(child, parent) {
    /*jshint validthis:true */
    function ctor() {
      this.constructor = child;
    }
    /*jshint validthis:false */
    ctor.prototype = parent.prototype;
    /*jshint newcap:false */
    child.prototype = new ctor();
    /*jshint newcap:true */
    return child;
  };
  
  module.exports = extend;

});
