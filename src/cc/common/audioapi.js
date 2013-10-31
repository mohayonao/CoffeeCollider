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
        }
        WebAudioAPI.prototype.init = function() {
          var sys = this.sys;
          var onaudioprocess;
          var strm = sys.strm;
          var strmLength = sys.strmLength;
          if (this.sys.speaker) {
            if (this.sys.sampleRate === this.sampleRate) {
              onaudioprocess = function(e) {
                var outs = e.outputBuffer;
                var outL = outs.getChannelData(0);
                var outR = outs.getChannelData(1);
                var i = strmLength, j = strmLength << 1;
                sys.process();
                while (j--, i--) {
                  outL[i] = strm[i] * 0.000030517578125;
                  outR[i] = strm[j] * 0.000030517578125;
                }
              };
            }
          } else {
            onaudioprocess = function() {
              sys.process();
            };
          }
          this.bufSrc = this.context.createBufferSource();
          if (this.context.createScriptProcessor) {
            this.jsNode = this.context.createScriptProcessor(strmLength, 2, this.channels);
          } else {
            this.jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
          }
          this.jsNode.onaudioprocess = onaudioprocess;
        };
        WebAudioAPI.prototype.play = function() {
          if (!this.bufSrc) {
            return; // TODO: throw an error
          }
          if (this.bufSrc.noteOn) {
            this.bufSrc.noteOn(0);
            this.bufSrc.connect(this.jsNode);
          }
          if (!this.delegate) {
            this.jsNode.connect(this.context.destination);
          }
        };
        WebAudioAPI.prototype.pause = function() {
          if (!this.bufSrc) {
            return; // TODO: throw an error
          }
          this.bufSrc.disconnect();
          if (!this.delegate) {
            this.jsNode.disconnect();
          }
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
            samples    : samples,
          });
        };
        return WebAudioAPI;
      })();
    } else if (typeof Audio === "function" && typeof new Audio().mozSetup === "function") {
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
          var inL = new Int16Array(sys.strm.buffer, 0, sys.strmLength);
          var inR = new Int16Array(sys.strm.buffer, sys.strmLength * 2);

          var onaudioprocess = function() {
            if (written > Date.now() - start) {
              return;
            }
            var i = interleaved.length;
            var j = inL.length;
            sys.process();
            while (j--) {
              interleaved[--i] = inR[j] * 0.000030517578125;
              interleaved[--i] = inL[j] * 0.000030517578125;
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

    if (!AudioAPI) {
      AudioAPI = (function() {
        function FallbackAudioAPI(sys) {
          this.sys = sys;
          this.sampleRate = 44100;
          this.channels   = 2;
          this.type = "Fallback";
        }
        FallbackAudioAPI.prototype.init = function() {
        };
        FallbackAudioAPI.prototype.play = function() {
          if (fallback.play) {
            this.play = fallback.play;
            this.play();
          }
        };
        FallbackAudioAPI.prototype.pause = function() {
          if (fallback.pause) {
            this.pause = fallback.pause;
            this.pause();
          }
        };
        
        var fallback = {};
        window.addEventListener("load", function() {
          var swfSrc  = cc.rootPath + "coffee-collider-fallback.swf";
          var swfName = swfSrc + "?" + Date.now();
          var swfId   = "coffee-collider-fallback";
          var div = document.createElement("div");
          div.style.display = "inline";
          div.width  = 1;
          div.height = 1;
          /*jshint quotmark:single */
          div.innerHTML = '<object id="'+swfId+'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="1" height="1"><param name="movie" value="'+swfName+'"/><param name="bgcolor" value="#FFFFFF"/><param name="quality" value="high"/><param name="allowScriptAccess" value="always"/></object>';
          /*jshint quotmark:double */
          document.body.appendChild(div);
          
          window.coffeecollider_flashfallback_init = function() {
            var swf = document.getElementById(swfId);
            var timerId = 0;
            fallback.play = function() {
              if (timerId === 0) {
                var sys = this.sys;
                var msec = (sys.strmLength / sys.sampleRate) * 1000;
                var written = 0;
                var start = Date.now();
                var out   = new Array(sys.strmLength * sys.channels);
                var len   = out.length;
                
                var onaudioprocess = function() {
                  if (written > Date.now() - start) {
                    return;
                  }
                  sys.process();
                  var _in = sys.strm;
                  for (var i = 0; i < len; ++i) {
                    out[i] = String.fromCharCode( ((_in[i] + 32768)>>1) + 16384 );
                  }
                  swf.writeAudio(out.join(""));
                  written += msec;
                };

                timerId = setInterval(onaudioprocess, msec * 0.8);
                swf.play();
              }
            };
            fallback.pause = function() {
              if (timerId !== 0) {
                swf.pause();
                clearInterval(timerId);
                timerId = 0;
              }
            };
          };
        });
        return FallbackAudioAPI;
      })();
    }
  } else if (typeof global.GLOBAL !== "undefined") {
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
      cc.createAudioAPI = function(sys, opts) {
        return new AudioAPI(sys, opts);
      };
    }
  };

});
