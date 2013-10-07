define(function(require, exports, module) {
  "use strict";

  var klass;
  module.exports = {
    getAPI: function() {
      return klass;
    }
  };

  var AudioContext = global.AudioContext || global.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  function WebAudioAPI(sys) {
    this.sys = sys;
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    this.channels   = sys.channels;
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

  klass = WebAudioAPI;

});
