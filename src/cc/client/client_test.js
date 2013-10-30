define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var nop = function() { return {}; };
  
  describe("client.js", function() {
    var called;
    beforeEach(function() {
      require("./client").use();
      called = [];
      cc.exports = nop;
      cc.createTimeline = function() {
        return {
          play: function() {
            called.push("tl.play");
          },
          reset: function() {
            called.push("tl.reset");
          },
          process: function() {
            called.push("tl.process");
          }
        };
      };
      cc.resetBuffer = function() {
        called.push("resetBuffer");
      };
      cc.resetNode   = function() {
        called.push("resetNode");
      };
      cc.resetNativeTimers = function() {
        called.push("resetNativeTimers");
      };
    });
    describe("SynthClient", function() {
      describe("createSynthClient", function() {
        beforeEach(function() {
          cc.createWebWorker = nop;
        });
        it("WebWorker", function() {
          cc.opmode = "worker";
          cc.createSynthClient();
          assert.equal(cc.opmode, "worker");
        });
        it("IFrame", function() {
          cc.opmode = "iframe";
          cc.createSynthClient();
          assert.equal(cc.opmode, "iframe");
        });
        it("WebSocket", function() {
          cc.opmode = "socket";
          cc.createSynthClient();
          assert.equal(cc.opmode, "socket");
        });
      });
      describe("instance methods", function() {
        var instance, sendToIF, sendToServer;
        beforeEach(function() {
          sendToIF = sendToServer = [""];
          cc.opmode = "worker";
          instance = cc.createSynthClient();
          instance.sendToServer = function(msg) {
            sendToServer = msg;
          };
          instance.sendToIF = function(msg) {
            sendToIF = msg;
          };
        });
        it("#pushToTimeline", function() {
          instance.pushToTimeline(0);
          instance.pushToTimeline(1);
          instance.pushToTimeline(2);
          assert.deepEqual(instance.timelineResult, [0, 1, 2]);
        });
        it("#play", function() {
          instance.play(["/play"]);
          assert.deepEqual(called, ["tl.play"]);
          assert.deepEqual(sendToServer, ["/play"]);
        });
        it("#pause", function() {
          instance.pause(["/pause"]);
          assert.deepEqual(sendToServer, ["/pause"]);
        });
        it("#reset", function() {
          instance.reset(["/reset"]);
          assert.notEqual(called.indexOf("resetBuffer")      , -1);
          assert.notEqual(called.indexOf("resetNode")        , -1);
          assert.notEqual(called.indexOf("resetNativeTimers"), -1);
          assert.notEqual(called.indexOf("tl.reset")         , -1);
          assert.equal(called.length, 4);
          assert.deepEqual(sendToServer, ["/reset"]);
        });
        it("#requestBuffer", function() {
          // SEE: messaging :: /buffer/response
        });
      });
      describe("messaging", function() {
        var instance, sendToIF, sendToServer;
        beforeEach(function() {
          sendToIF = sendToServer = [""];
          cc.opmode = "worker";
          instance = cc.createSynthClient();
          instance.sendToServer = function(msg) {
            sendToServer = msg;
          };
          instance.sendToIF = function(msg) {
            sendToIF = msg;
          };
        });
        it("/connected", function() {
          instance.recvFromServer(["/connected", 96000, 4]);
          assert.deepEqual(sendToIF, ["/connected", 96000, 4]);
        });
        it("/init", function() {
          instance.recvFromIF(["/init", 44100, 2]);
          assert.equal(instance.sampleRate, 44100);
          assert.equal(instance.channels  , 2);
          assert.deepEqual(sendToServer, ["/init", 44100, 2]);
        });
        it("/play", function() {
          instance.recvFromIF(["/play"]);
          assert.deepEqual(sendToServer, ["/play"]);
        });
        it("/pause", function() {
          instance.recvFromIF(["/pause"]);
          assert.deepEqual(sendToServer, ["/pause"]);
        });
        it("/reset", function() {
          instance.recvFromIF(["/reset"]);
          assert.deepEqual(sendToServer, ["/reset"]);
        });
        describe("/execute", function() {
          it("not append, without callback", function() {
            var code = "global.result = 10";
            instance.recvFromIF(["/execute", 0, code, false, "", false]);
            assert.equal(global.result, 10);
            assert.deepEqual(sendToIF, [""]);
            assert.deepEqual(sendToServer, ["/reset"]);
          });
          it("append, without callback", function() {
            var code = "global.result = 20";
            instance.recvFromIF(["/execute", 0, code, true, "", false]);
            assert.equal(global.result, 20);
            assert.deepEqual(sendToIF, [""]);
            assert.deepEqual(sendToServer, [""]);
          });
          it("not append, with callback", function() {
            var code = "global.result = 30";
            instance.recvFromIF(["/execute", 0, code, false, "", true]);
            assert.equal(global.result, 30);
            assert.deepEqual(sendToIF, ["/executed", 0, 30]);
            assert.deepEqual(sendToServer, ["/reset"]);
          });
          it("append, with callback", function() {
            var code = "global.result = 40";
            instance.recvFromIF(["/execute", 0, code, true, "", true]);
            assert.equal(global.result, 40);
            assert.deepEqual(sendToIF, ["/executed", 0, 40]);
            assert.deepEqual(sendToServer, [""]);
          });
        });
        it("/buffer/response", function(done) {
          var reqId = instance.bufferRequestId;
          instance.requestBuffer("path/to/audio", function(result) {
            assert.equal(result, "buffer");
            done()
          });
          setTimeout(function() {
            instance.recvFromIF(["/buffer/response", "buffer", reqId]);
          }, 0);
        });
        describe("socket", function() {
          // TODO: write
        });
        it("/process", function() {
          instance.recvFromServer(["/process"]);
          assert.deepEqual(sendToServer, ["/processed", []]);
        });
      });
      describe("processing", function() {
        var instance, sendToIF, sendToServer;
        it("WebWorker", function() {
          sendToIF = sendToServer = [""];
          cc.opmode = "worker";
          instance = cc.createSynthClient();
          instance.sendToServer = function(msg) {
            sendToServer = msg;
          };
          instance.sendToIF = function(msg) {
            sendToIF = msg;
          };
          
          instance.process();
          assert.deepEqual(called, ["tl.process"],
                           "WebWorkerClient processes one by one");
          assert.deepEqual(sendToServer, ["/processed", [] ]);
        });
        it("IFrame", function() {
          sendToIF = sendToServer = [""];
          cc.opmode = "iframe";
          instance = cc.createSynthClient();
          instance.sendToServer = function(msg) {
            sendToServer = msg;
          };
          instance.sendToIF = function(msg) {
            sendToIF = msg;
          };

          var expected = [];
          var i, n = instance.strmLength / instance.bufLength;
          for (var i = 0; i < n; ++i) {
            expected.push("tl.process");
          }
          
          instance.process();
          assert.deepEqual(called, expected,
                           "IFrameClient processes in a lump");
          expected = expected.map(function(x) { return 0; });
          assert.deepEqual(sendToServer, ["/processed", expected ]);
        });
        it("WebSocket", function() {
          sendToIF = sendToServer = [""];
          cc.opmode = "socket";
          instance = cc.createSynthClient();
          instance.sendToServer = function(msg) {
            sendToServer = msg;
          };
          instance.sendToIF = function(msg) {
            sendToIF = msg;
          };

          var expected = [];
          var i, n = instance.strmLength / instance.bufLength;
          for (var i = 0; i < n; ++i) {
            expected.push("tl.process");
          }
          
          instance.process();
          assert.deepEqual(called, expected,
                           "WebSocketClient processes in a lump");
          expected = expected.map(function(x) { return 0; });
          assert.deepEqual(sendToServer, ["/processed", expected ]);
        });
      });
    });
  });

});
