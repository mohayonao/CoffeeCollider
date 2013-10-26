define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var extend = require("../common/extend");
  var Compiler = require("./compiler/coffee").Compiler;
  var Emitter  = require("../common/emitter").Emitter;
  var unpack   = require("../common/pack").unpack;
  var commands = {};
  var slice    = [].slice;
  
  var AudioAPI;
  
  var CoffeeCollider = (function() {
    function CoffeeCollider(opts) {
      Emitter.bind(this);
      opts = opts || {};
      this.version = cc.version;
      if (opts.socket) {
        var impl  = new CoffeeColliderSocketImpl(this, opts);
        this.impl = impl;
        this.socket = {
          open: function() {
            impl.sendToClient([ "/socket-open" ]);
          },
          close: function() {
            impl.sendToClient([ "/socket-close" ]);
          },
          send: function(msg) {
            impl.sendToClient([ "/message", msg ]);
          }
        };
      } else if (opts.iframe) {
        this.impl = new CoffeeColliderIFrameImpl(this, opts);
      } else {
        this.impl = new CoffeeColliderWorkerImpl(this, opts);
      }
      this.sampleRate = this.impl.sampleRate;
      this.channels   = this.impl.channels;
      this.compiler   = this.impl.compiler;
    }
    
    CoffeeCollider.prototype.play = function() {
      this.impl.play();
      return this;
    };
    CoffeeCollider.prototype.pause = function() {
      this.impl.pause();
      return this;
    };
    CoffeeCollider.prototype.reset = function() {
      this.impl.reset();
      return this;
    };
    CoffeeCollider.prototype.execute = function() {
      this.impl.execute.apply(this.impl, arguments);
      return this;
    };
    CoffeeCollider.prototype.getStream = function() {
      return this.impl.strm;
    };
    CoffeeCollider.prototype.importScripts = function() {
      this.impl.importScripts(slice.call(arguments));
      return this;
    };
    CoffeeCollider.prototype.getWebAudioComponents = function() {
      return this.impl.getWebAudioComponents();
    };
    
    return CoffeeCollider;
  })();

  var CoffeeColliderImpl = (function() {
    function CoffeeColliderImpl(exports, opts) {
      this.exports  = exports;
      this.compiler = new Compiler();
      
      this.isPlaying = false;
      this.execId = 0;
      this.execCallbacks = {};

      this.sampleRate = 44100;
      this.channels   = 2;
      this.api = new AudioAPI(this, opts);
      this.sampleRate = this.api.sampleRate;
      this.channels   = this.api.channels;
      this.strm  = new Float32Array(this.strmLength * this.channels);
      this.clear = new Float32Array(this.strmLength * this.channels);
      this.strmList = new Array(8);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.api.init();
      
      if (opts.mouse !== false) {
        var syncItems = new Float32Array(C.SYNC_ITEM_LEN);
        window.addEventListener("mousemove", function(e) {
          syncItems[C.POS_X] = e.pageX / window.innerWidth;
          syncItems[C.POS_Y] = e.pageY / window.innerHeight;
        }, false);
        window.addEventListener("mousedown", function() {
          syncItems[C.BUTTON] = 1;
        }, false);
        window.addEventListener("mouseup", function() {
          syncItems[C.BUTTON] = 0;
        }, false);
        this.syncItems = syncItems;
      }
    }
    
    CoffeeColliderImpl.prototype.play = function() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        var strm = this.strm;
        for (var i = 0, imax = strm.length; i < imax; ++i) {
          strm[i] = 0;
        }
        this.strmList.splice(0);
        this.strmListReadIndex  = 0;
        this.strmListWriteIndex = 0;
        this.api.play();
        this.sendToClient(["/play"]);
      }
    };
    CoffeeColliderImpl.prototype.pause = function() {
      if (this.isPlaying) {
        this.sendToClient(["/pause"]);
        this.api.pause();
        this.isPlaying = false;
      }
    };
    CoffeeColliderImpl.prototype.reset = function() {
      this.execId = 0;
      this.execCallbacks = {};
      var strm = this.strm;
      for (var i = 0, imax = strm.length; i < imax; ++i) {
        strm[i] = 0;
      }
      this.strmList.splice(0);
      this.strmListReadIndex  = 0;
      this.strmListWriteIndex = 0;
      this.sendToClient(["/reset"]);
    };
    CoffeeColliderImpl.prototype.process = function() {
      var strm = this.strmList[this.strmListReadIndex];
      if (strm) {
        this.strmListReadIndex = (this.strmListReadIndex + 1) & 7;
        this.strm.set(strm);
      }
      if (this.syncItems) {
        this.sendToClient(this.syncItems);
      }
    };
    CoffeeColliderImpl.prototype.execute = function(code) {
      var append, callback;
      var i = 1;
      if (typeof arguments[i] === "boolean") {
        append = arguments[i++];
      } else {
        append = false;
      }
      if (typeof arguments[i] === "function") {
        callback = arguments[i++];
      }
      if (typeof code === "string") {
        code = this.compiler.compile(code.trim());
        this.sendToClient([
          "/execute", this.execId, code, append, this.compiler.data, !!callback
        ]);
        if (callback) {
          this.execCallbacks[this.execId] = callback;
        }
        this.execId += 1;
      }
    };
    CoffeeColliderImpl.prototype.importScripts = function(list) {
      this.sendToClient(["/importScripts", list]);
    };
    CoffeeColliderImpl.prototype.sendToClient = function(msg) {
      if (this.client) {
        this.client.postMessage(msg);
      }
    };
    CoffeeColliderImpl.prototype.recvFromClient = function(msg) {
      if (msg instanceof Float32Array) {
        this.strmList[this.strmListWriteIndex] = msg;
        this.strmListWriteIndex = (this.strmListWriteIndex + 1) & 7;
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    CoffeeColliderImpl.prototype.readAudioFile = function(path, callback) {
      var api = this.api;
      if (!api.decodeAudioFile) {
        callback(null);
        return;
      }
      var decode = function(buffer) {
        api.decodeAudioFile(buffer, function(buffer) {
          callback(buffer);
        });
      };
      var xhr = new XMLHttpRequest();
      xhr.open("GET", path);
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 && xhr.response) {
            if (callback) {
              decode(xhr.response);
            }
          } else {
            callback(null);
          }
        }
      };
      xhr.send();
    };
    CoffeeColliderImpl.prototype.getWebAudioComponents = function() {
      if (this.api.type === "Web Audio API") {
        return [ this.api.context, this.api.jsNode ];
      }
      return [];
    };
    
    return CoffeeColliderImpl;
  })();
  
  
  var CoffeeColliderWorkerImpl = (function() {
    function CoffeeColliderWorkerImpl(exports, opts) {
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      this.client = new Worker(cc.coffeeColliderPath);
      this.client.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
    }
    extend(CoffeeColliderWorkerImpl, CoffeeColliderImpl);
    
    return CoffeeColliderWorkerImpl;
  })();
  
  
  var CoffeeColliderIFrameImpl = (function() {
    function CoffeeColliderIFrameImpl(exports, opts) {
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      document.body.appendChild(iframe);

      this.iframe = iframe;
      // TODO: want to remove 'allow-same-origin'
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#iframe'></script>";
      var channel = new MessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(null, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
      this.client = channel.port1;
    }
    extend(CoffeeColliderIFrameImpl, CoffeeColliderImpl);
    
    return CoffeeColliderIFrameImpl;
  })();


  var CoffeeColliderSocketImpl = (function() {
    function CoffeeColliderSocketImpl(exports, opts) {
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      CoffeeColliderImpl.call(this, exports, opts);
      var that = this;
      var iframe = document.createElement("iframe");
      iframe.style.width  = 0;
      iframe.style.height = 0;
      iframe.style.border = 0;
      document.body.appendChild(iframe);

      this.iframe = iframe;
      // TODO: want to remove 'allow-same-origin'
      iframe.sandbox = "allow-scripts allow-same-origin";
      iframe.srcdoc = "<script src='" + cc.coffeeColliderPath + "#socket'></script>";
      var channel = new MessageChannel();
      iframe.onload = function() {
        iframe.contentWindow.postMessage(opts.socket, [channel.port2], "*");
      };
      channel.port1.onmessage = function(e) {
        that.recvFromClient(e.data);
      };
      this.client = channel.port1;
    }
    extend(CoffeeColliderSocketImpl, CoffeeColliderImpl);
    
    return CoffeeColliderSocketImpl;
  })();
  
  commands["/connect"] = function() {
    this.sendToClient([
      "/init", this.sampleRate, this.channels
    ]);
  };
  commands["/execute"] = function(msg) {
    var execId = msg[1];
    var result = msg[2];
    var callback = this.execCallbacks[execId];
    if (callback) {
      if (result !== undefined) {
        result = unpack(result);
      }
      callback(result);
      delete this.execCallbacks[execId];
    }
  };
  commands["/buffer/request"] = function(msg) {
    var that = this;
    var requestId = msg[2];
    this.readAudioFile(msg[1], function(buffer) {
      that.sendToClient(["/buffer/response", buffer, requestId]);
    });
  };
  commands["/message"] = function(msg) {
    this.exports.emit("message", msg[1]);
  };
  require("../common/console").receive(commands);
  
  
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
      };
      WebAudioAPI.prototype.play = function() {
        if (!this.bufSrc) {
          return; // TODO: throw an error
        }
        this.bufSrc.noteOn(0);
        this.bufSrc.connect(this.jsNode);
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
        var numSamples = buffer.length * buffer.numberOfChannels;
        var samples = new Float32Array(numSamples);
        for (var i = 0, imax = buffer.numberOfChannels; i < imax; ++i) {
          samples.set(buffer.getChannelData(i), i * buffer.length);
        }
        callback({
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
    CoffeeCollider: CoffeeCollider
  };

});
