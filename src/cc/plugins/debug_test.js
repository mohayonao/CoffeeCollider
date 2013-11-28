define(function(require, exports, module) {
  "use strict";

  var testTools = require("../../testTools");
  var ugenTestSuite = testTools.ugenTestSuite;
  var unitTestSuite = testTools.unitTestSuite;
  
  var cc = require("../cc")
  var ugen = require("../lang/ugen");
  var unit = require("../server/unit");
  var debug = require("./debug");

  describe("plugin/debug.js", function() {
    var _console;
    ugenTestSuite("Debug", {
      ar: {
        ok: ["in",0]
      },
      kr: {
        ok: ["in",0]
      },
    }).unitTestSuite([
      { rate: C.CONTROL,
        inputs: [
          { name:"in", rate:C.CONTROL, value:unitTestSuite.in0 }
        ],
        checker: function(result) {
          console.log(result);
        }
      }
    ], {
      before: function() {
        _console = cc.global.console;
        cc.global.console = {
          log: function() {}
        };
      },
      after: function() {
        cc.global.console = _console;
      }
    });
  });    

});
