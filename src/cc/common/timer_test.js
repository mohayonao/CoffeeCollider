define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("../cc");
  var timer = require("./timer");

  describe("common/timer.js", function() {
    before(function() {
      timer.use();
    });
    it("start/stop", function(done) {
      var t = cc.createTimer();
      var passed = 0;
      t.start(function() {
        throw "should be cancelled";
      }, 10);
      t.start(function() {
        assert.isTrue(t.isRunning());
        passed += 1;
        if (passed === 2) {
          t.stop();
          t.stop();
          done();
        } else if (passed > 2) {
          assert.fail("timer should be cancelled.");
        }
      }, 10);
    });
    describe("native hack", function(done) {
      beforeEach(function() {
        cc.replaceNativeTimerFunctions();
      });
      afterEach(function() {
        cc.restoreNativeTimerFunctions();
      });
      it("setInterval", function(done) {
        var t = setInterval(function() {
          clearInterval(t);
          done();
        }, 10);
      });
      it("setTimeout", function(done) {
        var t = setTimeout(function() {
          done();
        }, 10);
      });
      it("reset", function() {
        setInterval(function() {
          assert.fail("timer should be cancelled.");
        }, 10);
        setTimeout(function() {
          assert.fail("timer should be cancelled.");
        }, 10);
        cc.resetNativeTimers();
      });
    });
  });

});
