define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof global.GLOBAL !== "undefined") {
    AudioAPI = (function() {
      var Readable = global.require("stream").Readable;
      var Speaker  = global.require("speaker");
      if (!Readable) {
        Readable = global.require("readable-stream/readable");
      }
      function NodeAudioAPI(sys) {
        this.sys = sys;
        this.sampleRate = C.SOCKET_SAMPLERATE;
        this.channels   = C.SOCKET_CHANNELS;
        this.node = null;
        this.isPlaying = false;
      }
      NodeAudioAPI.prototype.init = function() {
      };
      NodeAudioAPI.prototype.play = function() {
        var sys = this.sys;
        this.isPlaying = true;
        this.node = new Readable();
        this.node._read = function(n) {
          var strm = sys._strm;
          var strmLength = sys.strmLength;
          var buf  = new Buffer(n);
          var x, i, j, k = 0;
          n = (n >> 2) / sys.strmLength;
          x = strm;
          while (n--) {
            sys._process();
            for (i = 0, j = strmLength; i < strmLength; ++i, ++j) {
              buf.writeInt16LE(strm[i], k);
              k += 2;
              buf.writeInt16LE(strm[j], k);
              k += 2;
            }
          }
          this.push(buf);
        };
        this.node.pipe(new Speaker({sampleRate:this.sampleRate}));
      };
      NodeAudioAPI.prototype.pause = function() {
        if (this.node) {
          process.nextTick(this.node.emit.bind(this.node, "end"));
        }
        this.node = null;
        this.isPlaying = false;
      };
      return NodeAudioAPI;
    })();
  }
  
  module.exports = {
    use: function() {
      cc.createNodeAudioAPI = function(sys, opts) {
        if (AudioAPI) {
          return new AudioAPI(sys, opts);
        }
      };
    }
  };

  module.exports.use();

});
