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
          compile: function(code) { return code + ".coffee"; }
        };
      };
      cc.createWebWorker = nop;
      cc.createAudioAPI = function() {
        return {
          sampleRate:8000, channels:2, strmLength:1024,
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
      var instance;
      describe("createSynthClient", function() {
        it("WebWorker", function() {
          instance = cc.createSynthClient();
          assert.instanceOf(instance, client.SynthClient);
          assert.equal("worker", cc.opmode);
        });
        it("WebSocket", function() {
          instance = cc.createSynthClient({socket:"path/to/socket"});
          assert.instanceOf(instance, client.SynthClient);
          assert.equal("socket", cc.opmode);
        });
        it("node.js", function() {
          instance = cc.createSynthClient({nodejs:true});
          assert.instanceOf(instance, client.SynthClient);
          assert.equal("nodejs", cc.opmode);
        });
      });
      describe("instance methods", function() {
        var mock;
        beforeEach(function() {
          mock = {
            play : function() { mock.play .result = [].slice.apply(arguments); },
            pause: function() { mock.pause.result = [].slice.apply(arguments); },
            reset: function() { mock.reset.result = [].slice.apply(arguments); },
            execute: function() { mock.execute.result = [].slice.apply(arguments); },
            compile: function() { mock.compile.result = [].slice.apply(arguments); return "compile"; },
            getStream: function() { mock.getStream.result = [].slice.apply(arguments); return "getStream"; },
            getWebAudioComponents: function() { mock.getWebAudioComponents.result = [].slice.apply(arguments); return "getWebAudioComponents"; },
          };
          instance = cc.createSynthClient();
          instance.impl = mock;
        });
        it("#play", function() {
          actual   = instance.play(1, 2);
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.play.result, [1, 2]);
        });
        it("#pause", function() {
          actual   = instance.pause(1, 2);
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.pause.result, [1, 2]);
        });
        it("#reset", function() {
          actual   = instance.reset(1, 2);
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.reset.result, [1, 2]);
        });
        it("#execute", function() {
          actual   = instance.execute(1, 2);
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.execute.result, [1, 2]);
        });
        it("#compile", function() {
          actual   = instance.compile(1, 2);
          expected = "compile";
          assert.equal(actual, expected);
          assert.deepEqual(mock.compile.result, [1, 2]);
        });
        it("#getStream", function() {
          actual   = instance.getStream(1, 2);
          expected = "getStream";
          assert.equal(actual, expected);
          assert.deepEqual(mock.getStream.result, [1, 2]);
        });
        it("#getWebAudioComponents", function() {
          actual   = instance.getWebAudioComponents(1, 2);
          expected = "getWebAudioComponents";
          assert.equal(actual, expected);
          assert.deepEqual(mock.getWebAudioComponents.result, [1, 2]);
        });
      });
    });
    describe("SynthClientImpl", function() {
      var instance, posted;
      beforeEach(function() {
        posted  = [];
        instance = cc.createSynthClientImpl({}, {});
        instance.lang = {
          postMessage: function(msg) { posted.push(msg); }
        };
      });
      it("#play", function() {
        instance.play();
        assert.deepEqual(posted, [["/play"]]);
        instance.play();
        assert.deepEqual(posted, [["/play"]]);
      });
      it("#play (cover)", function() {
        instance.api = null;
        instance.play();
      });
      it("_played", function(done) {
        instance.on("play", function() {
          done();
        });
        instance._played(1);
        assert.equal(instance.syncCount, 1);
      });
      it("#pause", function() {
        instance.pause();
        assert.deepEqual(posted, []);
        instance.play();
        instance.pause();
        assert.deepEqual(posted, [["/play"], ["/pause"]]);
      });
      it("_paused", function(done) {
        instance.on("pause", function() {
          done();
        });
        instance._paused();
      });
      it("_paused (cover)", function() {
        instance.api = null;
        instance._paused();
      });
      it("#reset", function(done) {
        instance.on("reset", function() {
          done();
        });
        instance.reset();
        assert.deepEqual(posted , [["/reset"]]);
        assert.equal(instance.execId, 0);
        assert.deepEqual(instance.execCallbacks, {});
        assert.equal(instance.strmListReadIndex , 0);
        assert.equal(instance.strmListWriteIndex, 0);
      });
      describe("#execute", function() {
        it("basis", function() {
          instance.pendingExecution = null; // ready
          instance.execute("code");
          assert.deepEqual(posted, [["/execute", 0, "code.coffee", false, false]]);
        });
        it("append", function() {
          instance.pendingExecution = null; // ready
          instance.execute("code", true);
          assert.deepEqual(posted, [["/execute", 0, "code.coffee", true, false]]);
        });
        it("callback", function() {
          instance.pendingExecution = null; // ready
          instance.execute("code", function(){});
          assert.deepEqual(posted, [["/execute", 0, "code.coffee", false, true]]);
        });
        it("append and callback", function() {
          instance.pendingExecution = null; // ready
          instance.execute("code", true, function(){});
          assert.deepEqual(posted, [["/execute", 0, "code.coffee", true, true]]);
        });
        it("lang:js", function() {
          instance.pendingExecution = null; // ready
          instance.execute("code", true, function(){}, {lang:"js"});
          assert.deepEqual(posted, [["/execute", 0, "code", true, true]]);
        });
        it("pending", function() {
          instance.execute("code");
          assert.deepEqual(instance.pendingExecution, [["code"]]);
        });
        it("typeof code != string", function() {
          assert.throws(function() {
            instance.execute();
          }, Error);
        });
      });
      describe("#compile", function() {
        it("basis", function() {
          actual   = instance.compile("code");
          expected = "code.coffee";
          assert.equal(actual, expected);
        });
        it("typeof code != string", function() {
          assert.throws(function() {
            instance.compile();
          }, Error);
        });
      });
      it("#getStream", function() {
        var strm = instance.strm;
        for (var i = 0; i < strm.length; i++) {
          if (i < strm.length * 0.5) {
            strm[i] =  32767;
          } else {
            strm[i] = -32768;
          }
        }
        actual = instance.getStream();
        assert.isObject(actual);
        assert.isFunction(actual.getChannelData);
        
        strm = actual.getChannelData(0);
        assert.equal(strm.length, instance.strmLength);
        assert.closeTo(strm[0], 1, 1e-4);
        assert.closeTo(strm[strm.length-1], 1, 1e-4);
        
        strm = actual.getChannelData(1);
        assert.equal(strm.length, instance.strmLength);
        assert.closeTo(strm[0], -1, 1e-4);
        assert.closeTo(strm[strm.length-1], -1, 1e-4);
        
        assert.throws(function() {
          actual.getChannelData(2);
        }, Error);
      });
      it("#getWebAudioComponents", function() {
        instance.api.type = "dummy";
        actual   = instance.getWebAudioComponents();
        expected = [];
        assert.deepEqual(actual, expected);

        instance.api.type = "Web Audio API";
        instance.api.context = "context";
        instance.api.jsNode  = "jsNode";
        actual   = instance.getWebAudioComponents();
        expected = [ "context", "jsNode" ];
        assert.deepEqual(actual, expected);
      });
      it("#process", function() {
        var i16;
        for (var i = 0; i < C.STRM_LIST_LENGTH; i++) {
          i16 = new Int16Array(instance.strmLength * 2);
          instance.recvFromLang(i16);
          instance.process();
          assert.deepEqual(instance.strm, i16);
        }
        assert.equal(instance.syncCount, C.STRM_LIST_LENGTH);
        
        instance.process();
        assert.deepEqual(instance.strm, i16);
        assert.equal(instance.syncCount, C.STRM_LIST_LENGTH);
      });
      it("#sendToLang", function() {
        instance.sendToLang(["/sendToLang(1)", 1, 2, 3]);
        assert.deepEqual(posted, [["/sendToLang(1)", 1, 2, 3]]);

        instance.sendToLang(["/sendToLang(2)", 4, 5, 6]);
        assert.deepEqual(posted, [["/sendToLang(1)", 1, 2, 3], ["/sendToLang(2)", 4, 5, 6]]);
      });
      it("#sendToLang (cover)", function() {
        instance.lang = null;
        instance.sendToLang();
      });
      it("#recvFromLang", function() {
        var i16;
        for (var i = 0; i <= C.STRM_LIST_LENGTH; i++) {
          i16 = new Int16Array(instance.strmLength * 2);
          instance.recvFromLang(i16);
          assert.equal(instance.strmList[i & C.STRM_LIST_MASK], i16);
          assert.equal(instance.strmListWriteIndex, i+1);
        }
      });
      describe("#readAudioFile", function(done) {
        it("no api", function() {
          instance.api = null;
          instance.readAudioFile();
        });
        it("basis", function(done) {
          instance.api.decodeAudioFile = function(_, callback) {
            callback(null, "decodeAudioFile");
          };
          instance.readAudioFile("path/to/audio", function(err, result) {
            assert.isNull(err);
            assert.equal(result, "decodeAudioFile");
            done();
          });
        });
        it("not support", function(done) {
          instance.api.decodeAudioFile = null;
          instance.readAudioFile("path/to/audio", function(err, result) {
            assert.isString(err);
            done();
          });
        });
      });
      describe("commands", function() {
        it("/connected", function() {
          instance.execute = function() {
            instance.execute.result = [].slice.call(arguments);
          };
          instance.pendingExecution = null;
          instance.recvFromLang(["/connected", 44100, 2, ["client_test_connected"]]);
          assert.deepEqual(posted, [["/init", instance.sampleRate, instance.channels, instance.strmLength]]);
          assert.isTrue(cc.global.client_test_connected);
          delete cc.global.client_test_connected;
        });
        it("/connected (node.js)", function() {
          instance.execute = function() {
            instance.execute.result = [].slice.call(arguments);
          };
          instance.pendingExecution = [ [1, 2, 3] ];
          instance.recvFromLang(["/connected", 44100, 2]);
          assert.deepEqual(posted, [["/init", instance.sampleRate, instance.channels, instance.strmLength]]);
          assert.deepEqual(instance.execute.result, [ 1, 2, 3 ]);
        });
        it("/played", function() {
          var syncCount = 0;
          instance._played = function(_syncCount) {
            syncCount = _syncCount;
          };
          instance.recvFromLang(["/played", 1]);
          assert.equal(syncCount, 1);
        });
        it("/paused", function() {
          var passed = false;
          instance._paused = function() {
            passed = true;
          };
          instance.recvFromLang(["/paused"]);
          assert.isTrue(passed);
        });
        it("/executed", function() {
          var result = null;
          instance.execCallbacks[0] = function(_result) {
            result = _result;
          };
          instance.recvFromLang(["/executed", 0, 10]);
          assert.equal(result, 10);
          
          result = null;
          instance.recvFromLang(["/executed", 0, 10]);
          assert.equal(result, null);
        });
        it("/buffer/request", function() {
          var path = null;
          instance.readAudioFile = function(_path, callback) {
            path = _path;
            callback(null, "done");
          };
          instance.recvFromLang(["/buffer/request", "/path/to/audio", 1]);
          assert.equal(path, "/path/to/audio");
          assert.deepEqual(posted, [["/buffer/response", "done", 1]]);
        });
        it("/buffer/request (error)", function() {
          var path = null;
          instance.readAudioFile = function(_path, callback) {
            path = _path;
            callback("error!!", "done");
          };
          instance.recvFromLang(["/buffer/request", "/path/to/audio", 1]);
          assert.equal(path, "/path/to/audio");
          assert.deepEqual(posted, []);
        });
        it("/socket/sendToClient", function(done) {
          instance.on("message", function(msg) {
            assert.equal(msg, "hello");
            done();
          });
          instance.recvFromLang(["/socket/sendToClient", "hello"]);
        });
        it("/unknown", function() {
          assert.throws(function() {
            instance.recvFromLang(["/unknown command"]);
          }, Error);
        });
      });
    });
  });

});
