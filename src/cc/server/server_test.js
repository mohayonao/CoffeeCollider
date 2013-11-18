define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var nop = function() { return {}; };
  
  describe("server.js", function() {
    var called;
    beforeEach(function() {
      require("./server").use();
      
      called = [];
      cc.lang = { process: nop };
      cc.createTimer = function() {
        return {
          isRunning: function() {
            return false;
          },
          start:nop, stop:nop
        };
      };
      cc.createInstanceManager = function() {
        return {
          init: function() {
            called.push("im.init");
          },
          play: function() {
            called.push("im.play");
          },
          pause: function() {
            called.push("im.pause");
          },
          reset: function() {
            called.push("im.reset");
          },
          pushToTimeline: function(userId, timeline) {
            called.push("im.pushToTimeline");
          },
          append: function() {
            called.push("im.append");
          },
          remove: function() {
            called.push("im.remove");
          },
          process:function() {
            called.push("im.process");
          },
        };
      };
    });
    describe("SynthServer", function() {
      describe("createSynthServer", function() {
        it("WebWorker", function() {
          cc.opmode = "worker";
          cc.createSynthServer();
          assert.equal(cc.opmode, "worker");
        });
        it("WebSocket", function() {
          cc.opmode = "socket";
          cc.createSynthServer();
          assert.equal(cc.opmode, "socket");
        });
      });
      describe("messaging", function() {
        var instance, sendToLang;
        beforeEach(function() {
          sendToLang = [""];
          cc.opmode = "worker";
          instance = cc.createSynthServer();
          instance.sendToLang = function(msg) {
            sendToLang = msg;
          };
        });
        it("/init", function() {
          instance.recvFromLang(["/init", 8000, 1]);
          assert.equal(instance.sampleRate, 8000);
          assert.equal(instance.channels  ,    1);
        });
        it("/play", function() {
          instance.recvFromLang(["/play"]);
        });
        it("/pause", function() {
          instance.recvFromLang(["/pause"]);
        });
        it("/reset", function() {
          instance.recvFromLang(["/reset"]);
        });
        it("/processed", function() {
          instance.recvFromLang(["/processed", 0]);
          assert.deepEqual(called, ["im.pushToTimeline"]);
        });
      });
    });
  });

});
