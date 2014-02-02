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
          var onaudioprocess, jsNode;
          
          jsNode = this.context.createScriptProcessor(strmLength, 2, this.channels);
          
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
        };
        WebAudioAPI.prototype.pause = function() {
          if (!this.jsNode) {
            return; // TODO: throw an error
          }
          if (!this.delegate) {
            this.jsNode.disconnect();
          }
          this.jsNode.onaudioprocess = null;
          this.jsNode = null;
        };
        WebAudioAPI.prototype.decodeAudioFile = function(buffer, callback) {
          this.context.decodeAudioData(buffer, function(buffer) {
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
              sampleRate: buffer.sampleRate,
              channels  : buffer.numberOfChannels,
              frames    : buffer.length,
              samples   : samples
            });
          }, function(err) {
            callback(err);
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
