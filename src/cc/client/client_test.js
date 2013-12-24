define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");

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
            run    : function() { mock.run    .result = [].slice.apply(arguments); },
            compile: function() { mock.compile.result = [].slice.apply(arguments); return "compile"; },
            getStream: function() { mock.getStream.result = [].slice.apply(arguments); return "getStream"; },
            getWebAudioComponents: function() { mock.getWebAudioComponents.result = [].slice.apply(arguments); return "getWebAudioComponents"; },
            load: function() { mock.load.result = [].slice.apply(arguments); },
            send: function() { mock.send.result = [].slice.apply(arguments); },
            getListeners: function() { mock.getListeners.result = [].slice.apply(arguments); return "getListeners"; },
            hasListeners: function() { mock.hasListeners.result = [].slice.apply(arguments); return "hasListeners"; },
            on  : function() { mock.on  .result = [].slice.apply(arguments); },
            once: function() { mock.once.result = [].slice.apply(arguments); },
            off : function() { mock.off .result = [].slice.apply(arguments); },
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
        it("#run", function() {
          actual   = instance.run(1, 2);
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.run.result, [1, 2]);
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
        it("#load", function() {
          actual   = instance.load("filepath", "callback");
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.load.result, ["filepath", "callback"]);
        });
        it("#send", function() {
          actual   = instance.send("message", {value:100});
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.send.result, ["message", {value:100}]);
        });
        it("#isPlaying", function() {
          instance.impl.isPlaying = true;
          actual   = instance.isPlaying();
          expected = true;
          assert.equal(actual, expected);
        });
        it("#getListeners", function() {
          actual   = instance.getListeners(1, 2);
          expected = "getListeners";
          assert.equal(actual, expected);
          assert.deepEqual(mock.getListeners.result, [1, 2]);
        });
        it("#hasListeners", function() {
          actual   = instance.hasListeners(1, 2);
          expected = "hasListeners";
          assert.equal(actual, expected);
          assert.deepEqual(mock.hasListeners.result, [1, 2]);
        });
        it("#on", function() {
          actual   = instance.on("event", "callback");
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.on.result, ["event", "callback"]);
        });
        it("#once", function() {
          actual   = instance.once("event", "callback");
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.once.result, ["event", "callback"]);
        });
        it("#off", function() {
          actual   = instance.off("event", "callback");
          expected = instance;
          assert.equal(actual, expected);
          assert.deepEqual(mock.off.result, ["event", "callback"]);
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
      it("#run", function() {
        instance.pendingExecution = null; // ready
        instance.run("code1");
        assert.deepEqual(posted, [
          ["/play"],
          ["/execute", 0, "code1.coffee", false, false]
        ]);
        
        instance.run("code2");
        assert.deepEqual(posted, [
          ["/play"],
          ["/execute", 0, "code1.coffee", false, false],
          ["/execute", 1, "code2.coffee", false, false]
        ]);
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
            strm[i] =  1;
          } else {
            strm[i] = -1;
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
      describe("#load", function() {
        var saved_opmode, xhr;
        var xhrStatus = 200;
        testTools.mock("createXMLHttpRequest", function() {
          var response = "";
          xhr = {};
          xhr.open = function(method, payload) {
            response = payload;
          };
          xhr.send = function() {
            xhr.response   = response;
            xhr.readyState = 1;
            xhr.onreadystatechange();
            
            xhr.readyState = 4;
            xhr.status     = xhrStatus;
            xhr.onreadystatechange();
          };
          return xhr;
        });
        before(function() {
          saved_opmode = cc.opmode;
        });
        after(function() {
          cc.opmode = saved_opmode;
        });
        it("nodejs", function(done) {
          var code;
          cc.opmode = "nodejs";
          instance.load(__dirname + "/client_test.js", function(result) {
            assert.isString(result);
            code = result;
          });
          instance.load([__dirname + "/client_test.js"], function(result) {
            assert.deepEqual([code], result);
          });
          instance.load(__dirname + "/not-exists", function(result) {
            assert.isNull(result);
            done();
          });
        });
        it("worker", function(done) {
          var code;
          cc.opmode = "worker";
          xhrStatus = 200;
          instance.load("client_test.js", function(result) {
            assert.isString(result);
            code = result;
          });
          instance.load(["client_test.js"], function(result) {
            assert.deepEqual([code], result);
          });
          
          xhrStatus = 404;
          instance.load("/not-exists", function(result) {
            assert.isNull(result);
            done();
          });
        });
        it("error", function() {
          assert.throws(function() {
            instance.load("client_test.js");
          }, "cc#load requires a callback function.");
        });
      });
      it("#send", function() {
        instance.send([1, 2, 3], 4);
        assert.deepEqual(posted, [
          [ '/send', [ [ 1, 2, 3 ], 4 ] ]
        ]);
      });
      it("#process", function() {
        var f32;
        for (var i = 0; i < C.STRM_LIST_LENGTH; i++) {
          f32 = new Float32Array(instance.strmLength * 2);
          instance.recvFromLang(f32);
          instance.process();
          assert.deepEqual(instance.strm, f32);
        }
        assert.equal(instance.syncCount, C.STRM_LIST_LENGTH);
        
        instance.process();
        assert.deepEqual(instance.strm, f32);
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
        var f32;
        for (var i = 0; i <= C.STRM_LIST_LENGTH; i++) {
          f32 = new Float32Array(instance.strmLength * 2);
          instance.recvFromLang(f32);
          assert.equal(instance.strmList[i & C.STRM_LIST_MASK], f32);
          assert.equal(instance.strmListWriteIndex, i+1);
        }
      });
      describe("#readAudioFile", function(done) {
        var xhrStatus = 200;
        testTools.mock("createXMLHttpRequest", function() {
          var xhr;
          var response = "";
          xhr = {};
          xhr.open = function(method, payload) {
            response = payload;
          };
          xhr.send = function() {
            xhr.response   = response;
            xhr.readyState = 1;
            xhr.onreadystatechange();
            
            xhr.readyState = 4;
            xhr.status     = xhrStatus;
            xhr.onreadystatechange();
          };
          return xhr;
        });
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
