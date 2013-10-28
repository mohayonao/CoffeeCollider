define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var timer = require("./timer");

  describe("timer.js", function() {
    it("start/stop", function(done) {
      var t = new timer.Timer();
      var passed = 0;
      t.start(function() {
        passed += 1;
        if (passed === 2) {
          t.stop();
          done();
        } else if (passed > 2) {
          assert.fail("timer should be stopped.");
        }
      }, 10);
    });
    it("native hack", function(done) {
      timer.replaceNativeTimerFunctions();
      var passed = 0;
      setInterval(function() {
        passed += 1;
        if (passed === 2) {
          timer.resetNativeTimers();
          timer.restoreNativeTimerFunctions();
          done();
        } else if (passed > 2) {
          assert.fail("timer should be stopped.");
        }
      }, 10);
    });
  });

});
