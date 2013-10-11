define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var AudioAPI;
  
  var SoundSystem = (function() {
    function SoundSystem() {
      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = new AudioAPI(this);
      this.sampleRate = this.api.sampleRate;
      this.channels   = this.api.channels;
      this.colliders  = [];
      this.process    = process0;
      this.strmLength = 1024;
      this.bufLength  = 64;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.clear = new Float32Array(this.strmLength * this.channels);
      this.syncCount = 0;
      this.syncItems = new Float32Array(6); // syncCount, currentTime
      this.isPlaying = false;
    }
    var instance = null;
    SoundSystem.getInstance = function() {
      if (!instance) {
        instance = new SoundSystem();
      }
      return instance;
    };
    SoundSystem.prototype.append = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index === -1) {
        this.colliders.push(cc);
        if (this.colliders.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
    };
    SoundSystem.prototype.remove = function(cc) {
      var index = this.colliders.indexOf(cc);
      if (index !== -1) {
        this.colliders.splice(index, 1);
      }
      if (this.colliders.length === 1) {
        this.process = process1;
      } else if (this.colliders.length === 0) {
        this.process = process0;
      } else {
        this.process = processN;
      }
    };
    SoundSystem.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.syncCount = 0;
        this.api.play();
      }
    };
    SoundSystem.prototype.pause = function() {
      if (this.isPlaying) {
        var flag = this.colliders.every(function(cc) {
          return !cc.isPlaying;
        });
        if (flag) {
          this.isPlaying = false;
          this.api.pause();
        }
      }
    };

    var process0 = function() {
      this.strm.set(this.clear);
    };
    var process1 = function() {
      var cc = this.colliders[0];
      this.syncItems[0] = this.syncCount;
      cc.process();
      this.strm.set(cc.strm);
      cc.sync(this.syncItems);
      this.syncCount++;
    };
    var processN = function() {
      var strm = this.strm;
      var strmLength = strm.length;
      var colliders  = this.colliders;
      var syncItems  = this.syncItems;
      var cc, tmp;
      syncItems[0] = this.syncCount;
      strm.set(this.clear);
      for (var i = 0, imax = colliders.length; i < imax; ++i) {
        cc = colliders[i];
        cc.process();
        tmp = cc.strm;
        for (var j = 0; j < strmLength; j += 8) {
          strm[j  ] += tmp[j  ]; strm[j+1] += tmp[j+1]; strm[j+2] += tmp[j+2]; strm[j+3] += tmp[j+3];
          strm[j+4] += tmp[j+4]; strm[j+5] += tmp[j+5]; strm[j+6] += tmp[j+6]; strm[j+7] += tmp[j+7];
        }
        cc.sync(syncItems);
      }
      this.syncCount++;
    };
    
    return SoundSystem;
  })();

  var AudioContext = global.AudioContext || global.webkitAudioContext;
  
  if (AudioContext) {
    AudioAPI = (function() {
      function WebAudioAPI(sys) {
        this.sys = sys;
        this.context = new AudioContext();
        this.sampleRate = this.context.sampleRate;
        this.channels   = 2;
      }

      WebAudioAPI.prototype.play = function() {
        var sys = this.sys;
        var onaudioprocess;
        var strmLength  = sys.strmLength;
        var strmLength4 = strmLength * 4;
        var buffer = sys.strm.buffer;
        if (this.sys.sampleRate === this.sampleRate) {
          onaudioprocess = function(e) {
            var outs = e.outputBuffer;
            sys.process();
            outs.getChannelData(0).set(new Float32Array(
              buffer.slice(0, strmLength4)
            ));
            outs.getChannelData(1).set(new Float32Array(
              buffer.slice(strmLength4)
            ));
          };
        }
        this.bufSrc = this.context.createBufferSource();
        this.jsNode = this.context.createJavaScriptNode(strmLength, 2, this.channels);
        this.jsNode.onaudioprocess = onaudioprocess;
        this.bufSrc.noteOn(0);
        this.bufSrc.connect(this.jsNode);
        this.jsNode.connect(this.context.destination);
      };
      WebAudioAPI.prototype.pause = function() {
        this.bufSrc.disconnect();
        this.jsNode.disconnect();
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
      }
      AudioDataAPI.prototype.play = function() {
        var sys = this.sys;
        var audio = new Audio();
        var interleaved = new Float32Array(sys.strmLength * sys.channels);
        var msec = (sys.strmLength / sys.sampleRate) * 1000;
        var written = 0;
        var start = Date.now();
        var inL = new Float32Array(sys.strm.buffer, 0, sys.strmLength);
        var inR = new Float32Array(sys.strm.buffer, sys.strmLength * 4);

        var onaudioprocess = function() {
          if (written > Date.now() - start) {
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
      }
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
                  var x = (_in[i] * 16384 + 32768)|0;
                  x = Math.max(16384, Math.min(x, 49152));
                  out[i] = String.fromCharCode(x);
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
  
  module.exports = {
    SoundSystem: SoundSystem
  };

});
