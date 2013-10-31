define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("../cc");
  var timer = require("./timer");

  describe("timer.js", function() {
    before(function() {
      timer.use();
    });
    it("start/stop", function(done) {
      var t = cc.createTimer();
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
      cc.replaceNativeTimerFunctions();
      var passed = 0;
      setInterval(function() {
        passed += 1;
        if (passed === 2) {
          cc.resetNativeTimers();
          cc.restoreNativeTimerFunctions();
          done();
        } else if (passed > 2) {
          assert.fail("timer should be stopped.");
        }
      }, 10);
    });
  });

});
