define(function(require, exports, module) {
  "use strict";

  var cc   = require("../cc");
  var ugen = require("./ugen");

  require("./bop");
  require("./bufio");
  require("./debug");
  require("./decay");
  require("./delay");
  require("./env");
  require("./filter");
  require("./inout");
  require("./line");
  require("./madd");
  require("./mix");
  require("./noise");
  require("./osc");
  require("./pan");
  require("./random");
  require("./range");
  require("./reverb");
  require("./ui");
  require("./uop");
  
  Object.keys(cc.ugen.specs).forEach(function(name) {
    ugen.register(name, cc.ugen.specs[name]);
  });
  
  module.exports = {};

});
