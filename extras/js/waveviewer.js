(function() {
  "use strict";

  var WaveViewer = function(cc, canvas, opts) {
    opts = opts || {};
    this.cc = cc;
    this.canvas = canvas;
    this.canvas.width  = opts.width  || 1024;
    this.canvas.height = opts.height || 120;
    this.context = canvas.getContext("2d");
    this.context.fillStyle   = opts.fillStyle   || "white";
    this.context.strokeStyle = opts.strokeStyle || "gray";
    this.context.lineWidth   = opts.lineWidth   || 2;
    this.context.lineJoin    = "round";
    this.t = 0;
    this.isPlaying = false;
  };
  WaveViewer.prototype.start = function() {
    this.isPlaying = true;
    requestAnimationFrame(this.animate.bind(this));
  };
  WaveViewer.prototype.stop = function() {
    this.isPlaying = false;
  };
  WaveViewer.prototype.animate = function(t) {
    var context = this.context;
    if (this.isPlaying) {
      if (t - this.t > 60) {
        var strm = this.cc.getStream();
        var strmL = strm.getChannelData(0);
        var strmR = strm.getChannelData(1);
        var len  = strm.length * 0.5;
        var imax = 256;
        var dx   = this.canvas.width / imax;
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        context.beginPath();
        context.moveTo(0, this._calcY((strmL[0]+strmR[0])*0.5));
        for (var i = 0; i < imax; i++) {
          context.lineTo(i * dx, this._calcY((strmL[i]+strmR[i])*0.5));
        }
        context.lineTo(this.canvas.width, this._calcY((strmL[imax-1]+strmR[imax-1])*0.5));
        context.stroke();
        this.t = t;
      }
      requestAnimationFrame(this.animate.bind(this));
    } else {
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };
  WaveViewer.prototype._calcY = function(val) {
    return -val * 0.45 * this.canvas.height + (this.canvas.height * 0.5);
  };
  
  window.WaveViewer = WaveViewer;

})();
