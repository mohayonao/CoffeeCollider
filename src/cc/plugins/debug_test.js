define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
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
      ar: ["in",0],
      kr: ["in",0],
    }).unitTestSuite([
      { rate: C.CONTROL,
        inputs: [
          { name:"in", rate:C.CONTROL, value:unitTestSuite.in0  }
        ]
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
      },
      checker: function(statistics) {
        // console.log(statistics);
        assert.isFalse(statistics.hasNaN);
        assert.ok(statistics.min >= -1.0);
        assert.ok(statistics.max <= +1.0);
      }
    });
  });    

});
