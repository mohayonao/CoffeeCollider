define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./server");
  
  var cc = require("./cc");
  
  describe("server/server.js", function() {
    testTools.mock("lang");
    testTools.mock("createTimer");
    testTools.mock("createInstance");
    testTools.mock("createInstanceManager");
    
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
          instance.init();
          instance.recvFromLang(["/play"]);
        });
        it("/pause", function() {
          instance.init();
          instance.recvFromLang(["/pause"]);
        });
        it("/reset", function() {
          instance.init();
          instance.recvFromLang(["/reset"]);
        });
        it("/processed", function() {
          instance.init();
          instance.recvFromLang(["/processed", [0]]);
          assert.deepEqual(cc.createInstanceManager.called, [ "pushToTimeline" ]);
        });
      });
    });
  });

});
