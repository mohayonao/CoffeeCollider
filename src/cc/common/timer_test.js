define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var Timer = require("./timer").Timer;

  describe("timer.js", function() {
    it("start/stop", function(done) {
      var t = new Timer();
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
  });

});
