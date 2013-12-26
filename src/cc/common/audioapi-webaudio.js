define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var AudioAPI;
  
  if (typeof document !== "undefined") {
    var AudioContext = global.AudioContext || global.webkitAudioContext;
    if (AudioContext) {
      AudioAPI = (function() {
        function WebAudioAPI(sys, opts) {
          this.sys = sys;
          this.context = opts.AudioContext || new AudioContext();
          this.sampleRate = this.context.sampleRate;
          this.channels   = 2;
          this.type = "Web Audio API";
          this.delegate = !!opts.AudioContext;
          this.jsNode = null;
          this.bufSrc = null;
        }
        WebAudioAPI.prototype.init = function() {
        };
        WebAudioAPI.prototype.play = function() {
          var sys  = this.sys;
          var strm = sys.strm;
          var strmLength  = sys.strmLength;
          var strmLength4 = strmLength * 4;
          var strmL = new Float32Array(strm.buffer, 0, strmLength);
          var strmR = new Float32Array(strm.buffer, strmLength4);
          var onaudioprocess, bufSrc, jsNode;
          
          bufSrc = this.context.createBufferSource();
          if (this.context.createScriptProcessor) {
            jsNode = this.context.createScriptProcessor(strmLength, 2, this.channels);
          } else {
            // deprecated interface
            jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
          }
          
          if (bufSrc.start) {
            bufSrc.start(0);
          } else if (bufSrc.noteOn) {
            // deprecated interface
            bufSrc.noteOn(0);
          }
          bufSrc.connect(jsNode);
          
          if (sys.speaker) {
            if (sys.sampleRate === this.sampleRate) {
              onaudioprocess = function(e) {
                var outs = e.outputBuffer;
                sys.process();
                outs.getChannelData(0).set(strmL);
                outs.getChannelData(1).set(strmR);
              };
            }
          } else {
            onaudioprocess = function() {
              sys.process();
            };
          }
          jsNode.onaudioprocess = onaudioprocess;
          
          if (!this.delegate) {
            jsNode.connect(this.context.destination);
          }
          this.jsNode = jsNode;
          this.bufSrc = bufSrc;
        };
        WebAudioAPI.prototype.pause = function() {
          if (!this.jsNode) {
            return; // TODO: throw an error
          }
          this.bufSrc.disconnect();
          if (!this.delegate) {
            this.jsNode.disconnect();
          }
          this.jsNode.onaudioprocess = null;
          this.jsNode = null;
          this.bufSrc = null;
        };
        WebAudioAPI.prototype.decodeAudioFile = function(buffer, callback) {
          buffer = this.context.createBuffer(buffer, false);
          var bufLength   = buffer.length;
          var numChannels = buffer.numberOfChannels;
          var numSamples  = bufLength * numChannels;
          var samples = new Float32Array(numSamples);
          var i, j, k = 0;
          var channelData = new Array(numChannels);
          for (j = 0; j < numChannels; ++j) {
            channelData[j] = buffer.getChannelData(j);
          }
          for (i = 0; i < bufLength; ++i) {
            for (j = 0; j < numChannels; ++j) {
              samples[k++] = channelData[j][i];
            }
          }
          callback(null, {
            sampleRate : buffer.sampleRate,
            numChannels: buffer.numberOfChannels,
            numFrames  : buffer.length,
            samples    : samples
          });
        };
        return WebAudioAPI;
      })();
    }
  }

  cc.createWebAudioAPI = function(sys, opts) {
    if (AudioAPI) {
      return new AudioAPI(sys, opts);
    }
  };
  
  module.exports = {};
  
});
