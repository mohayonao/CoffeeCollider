define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("../cc");
  var client = require("./client");
  var nop = function() { return {}; };
  
  describe("client/client.js", function() {
    var actual, expected;
    var _createSynthClientWorkerImpl, _createCompiler;
    var _createWebWorker, _createAudioAPI, _createXMLHttpRequest;
    before(function() {
      _createSynthClientWorkerImpl = cc.createSynthClientWorkerImpl;
      _createCompiler  = cc.createCompiler;
      _createWebWorker = cc.createWebWorker;
      _createAudioAPI  = cc.createAudioAPI
      _createXMLHttpRequest = cc.createXMLHttpRequest
      
      cc.createSynthClientWorkerImpl = function() {
        cc.opmode = "worker";
        return { sampleRate: 44100, channels: 2 };
      };
      cc.createCompiler = function() {
        return {
          compile: function(code) { return code; }
        };
      };
      cc.createWebWorker = nop;
      cc.createAudioAPI = function() {
        return {
          sampleRate:8000, channels:1, strmLength:1024,
          init:nop, play:nop, pause:nop,
        };
      };
      cc.createXMLHttpRequest = function() {
        var xhr = { open:nop, readyState:4, status:200, response:"xhr" };
        xhr.send = function() {
          setTimeout(function() { xhr.onreadystatechange(); }, 10);
        };
        return xhr;
      };
    });
    after(function() {
      cc.createSynthClientWorkerImpl = _createSynthClientWorkerImpl;
      cc.createCompiler  = _createCompiler;
      cc.createWebWorker = _createWebWorker;
      cc.createAudioAPI  = _createAudioAPI
      cc.createXMLHttpRequest = _createXMLHttpRequest
    });
    describe("SynthClient", function() {
      describe("createSynthClient", function() {
        it("WebWorker", function() {
          var exports = cc.createSynthClient();
          assert.equal("worker", cc.opmode);
        });
        it("WebSocket", function() {
          var exports = cc.createSynthClient({socket:"path/to/socket"});
          assert.equal("socket", cc.opmode);
        });
      });
      describe("instance methods", function() {
        var instance, passed;
        beforeEach(function() {
          passed = "";
          cc.createSynthClientWorkerImpl = function() {
            return {
              play: function() {
                return (passed = "play");
              },
              pause: function() {
                return (passed = "pause");
              },
              reset: function() {
                return (passed = "reset");
              },
              execute: function() {
                return (passed = "execute");
              },
              getStream: function() {
                return (passed = "getStream");
              },
              importScripts: function() {
                return (passed = "importScripts");
              },
              getWebAudioComponents: function() {
                return (passed = "getWebAudioComponents");
              }
            };
          };
          instance = cc.createSynthClient();
        });
        it("#play", function() {
          actual = instance.play();
          assert.equal(actual, instance, "return self");
          assert.equal(passed, "play",
                       "should call impl.play()");
        });
        it("#pause", function() {
          actual = instance.pause();
          assert.equal(actual, instance, "return self");
          assert.equal(passed, "pause",
                       "should call impl.pause()");
        });
        it("#reset", function() {
          actual = instance.reset();
          assert.equal(actual, instance, "return self");
          assert.equal(passed, "reset",
                       "should call impl.reset()");
        });
        it("#execute", function() {
          actual = instance.execute();
          assert.equal(actual, instance, "return self");
          assert.equal(passed, "execute",
                       "should call impl.execute()");
        });
        it("getStream", function() {
          actual = instance.getStream();
          assert.equal(actual, "getStream");
          assert.equal(passed, "getStream",
                       "should call impl.getStream()");
        });
        it("importScripts", function() {
          actual = instance.importScripts();
          assert.equal(actual, instance, "return self");
          assert.equal(passed, "importScripts",
                       "should call impl.importScripts()");
        });
        it("getWebAudioComponents", function() {
          actual = instance.getWebAudioComponents();
          assert.equal(actual, "getWebAudioComponents");
          assert.equal(passed, "getWebAudioComponents",
                       "should call impl.getWebAudioComponents()");
        });
      });
    });
    describe("SynthClientImpl", function() {
      var instance, event, emitted, posted;
      beforeEach(function() {
        event = posted = "";
        instance = cc.createSynthClientImpl({ emit:function(e) {
          event = e;
          emitted = [].slice.call(arguments, 1);
        }}, {});
        instance.lang = {
          postMessage: function(msg) { posted = msg; }
        };
      });
      describe("instance methods", function() {
        it("#play", function() {
          instance.play();
          assert.deepEqual(posted, ["/play"]);
          
          event = posted = "";
          instance.play();
          assert.equal(posted, "");
        });
        it("#pause", function() {
          instance.pause();
          assert.equal(posted, "");

          event = posted = "";
          instance.play();
          instance.pause();
          assert.deepEqual(posted, ["/pause"]);
          
          event = posted = "";
          instance.pause();
          assert.equal(posted, "");
        });
        it("#reset", function() {
          instance.reset();
          assert.equal(event, "reset");
          assert.deepEqual(posted, ["/reset"]);
        });
        describe("#execute", function() {
          beforeEach(function() {
            instance.pendingExecution = null;
          });
          it("not append, without callback", function() {
            instance.execute("10");
            assert.deepEqual(posted, [ "/execute", 0, "10", false, false ]);
          });
          it("append, without callback", function() {
            instance.execute("10", true);
            assert.deepEqual(posted, [ "/execute", 0, "10", true, false ]);
          });
          it("not append, callback", function() {
            instance.execute("10", nop);
            assert.deepEqual(posted, [ "/execute", 0, "10", false, true ]);
          });
          it("append, with callback", function() {
            instance.execute("10", true, nop);
            assert.deepEqual(posted, [ "/execute", 0, "10", true, true ]);
          });
          it("pending", function() {
            instance.pendingExecution = [];
            instance.execute("10", true, nop);
            assert.deepEqual(posted, '');
            assert.deepEqual(instance.pendingExecution[0], ["10", true, nop]);
          });
        });
        it("#getStream", function() {
          var stream = instance.getStream();
          assert.instanceOf(stream.getChannelData(0), Float32Array);
          assert.instanceOf(stream.getChannelData(1), Float32Array);
          assert.isUndefined(stream.getChannelData(2));
        });
        it("#importScripts", function() {
          instance.importScripts(["A", "B", "C"]);
          assert.deepEqual(posted, ["/importScripts", ["A", "B", "C"]]);
        });
        it("#readAudioFile", function(done) {
          instance.api.decodeAudioFile = function(_, callback) {
            callback(null, "decodeAudioFile");
          };
          instance.readAudioFile("path/to/audio", function(err, result) {
            assert.equal(result, "decodeAudioFile");
            done();
          });
        });
        describe("messaging", function() {
          it("/connected", function() {
            instance.recvFromLang(["/connected", 96000, 4, []]);
            assert.equal(event, "connected");
            assert.deepEqual(posted, ["/init", 8000, 1, 1024]);
          });
          it("/executed", function() {
            var result;
            instance.pendingExecution = null;
            instance.execute("10", function(_result) {
              result = _result;
            });
            instance.recvFromLang(["/executed", 0, 1000]);
            assert.equal(result, 1000);
            instance.recvFromLang(["/executed", 0, 2000]);
            assert.equal(result, 1000, "callback would be called only once");
          });
          it("/buffer/request", function() {
            instance.recvFromLang(["/buffer/request", "/path/to/audio", 1]);
            assert.deepEqual(posted, "");
          });
          it("/socket/sendToClient", function() {
            instance.recvFromLang(["/socket/sendToClient", "hello"]);
            assert.equal(event, "message");
            assert.deepEqual(emitted, ["hello"]);
          });
        });
      });
    });
  });

});
