define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./server");
  
  var cc = require("./cc");
  
  describe("server/server.js", function() {
    testTools.mock("lang");
    testTools.mock("createTimer");
    testTools.mock("createWorld");
    
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
        var s, sendToLang;
        beforeEach(function() {
          sendToLang = [""];
          cc.opmode = "worker";
          s = cc.createSynthServer();
          s.sendToLang = function(msg) {
            sendToLang = msg;
          };
        });
        it("/init", function() {
          s.recvFromLang(["/init", 8000, 1]);
          assert.equal(s.sampleRate, 8000);
          assert.equal(s.channels  ,    1);
        });
        it("/play", function() {
          s.init();
          s.recvFromLang(["/play"]);
        });
        it("/pause", function() {
          s.init();
          s.recvFromLang(["/pause"]);
        });
        it("/reset", function() {
          s.init();
          s.recvFromLang(["/reset"]);
        });
        it("/processed", function() {
          s.init();
          s.recvFromLang(["/processed", [0]]);
          assert.deepEqual(cc.createWorld.called, [ "pushToTimeline" ]);
        });
      });
    });
  });

});
