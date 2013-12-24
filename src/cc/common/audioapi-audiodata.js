define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof document !== "undefined") {
    if (typeof Audio === "function" && typeof new Audio().mozSetup === "function") {
      AudioAPI = (function() {
        /*global URL:true */
        var timer = (function() {
          var source = "var t=0;onmessage=function(e){if(t)t=clearInterval(t),0;if(typeof e.data=='number'&&e.data>0)t=setInterval(function(){postMessage(0);},e.data);};";
          var blob = new Blob([source], {type:"text/javascript"});
          var path = URL.createObjectURL(blob);
          return new Worker(path);
        })();
        /*global URL:false */
        function AudioDataAPI(sys) {
          this.sys = sys;
          this.sampleRate = 44100;
          this.channels   = 2;
          this.type = "Audio Data API";
        }
        AudioDataAPI.prototype.init = function() {
          this.audio = new Audio();
          this.interleaved = new Float32Array(this.sys.strmLength * this.sys.channels);
        };
        AudioDataAPI.prototype.play = function() {
          if (!this.audio) {
            return; // TODO: throw an error
          }
          var sys = this.sys;
          var audio = this.audio;
          var interleaved = this.interleaved;
          var msec = (sys.strmLength / sys.sampleRate) * 1000;
          var written = 0;
          var start = Date.now();
          var inL = new Float32Array(sys.strm.buffer, 0, sys.strmLength);
          var inR = new Float32Array(sys.strm.buffer, sys.strmLength * 2);

          var onaudioprocess = function() {
            if (written - C.PROCESS_MARGIN > Date.now() - start) {
              return;
            }
            var i = interleaved.length;
            var j = inL.length;
            sys.process();
            while (j--) {
              interleaved[--i] = inR[j];
              interleaved[--i] = inL[j];
            }
            audio.mozWriteAudio(interleaved);
            written += msec;
          };

          audio.mozSetup(sys.channels, sys.sampleRate);
          timer.onmessage = onaudioprocess;
          timer.postMessage(msec * 0.8);
        };
        AudioDataAPI.prototype.pause = function() {
          if (!this.audio) {
            return; // TODO: throw an error
          }
          timer.postMessage(0);
        };
        return AudioDataAPI;
      })();
    }
  }
  
  cc.createAudioDataAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};

});
