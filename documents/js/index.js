window.onload = function() {
  "use strict";
  
  var srcFragment = "try:";
  var $code = document.getElementById("code");
  var $exec = document.getElementById("exec");
  var $link = document.getElementById("link");
  var $play = document.getElementById("play");
  var $ctrl = document.getElementById("ctrl");

  var cc = window.cc = new CoffeeCollider();
  var isPlaying = false;
  
  $exec.addEventListener("click", function(e) {
    var code = $code.value.trim();
    if (e.shiftKey) {
      console.log(cc.compiler.toString(code));
    } else {
      cc.execute(code, function(res) {
        if (res !== undefined) {
          console.log(res);
        }
      });
    }
  }, false);

  $link.addEventListener("click", function() {
    var code = $code.value.trim();
    window.location = "#" + srcFragment + encodeURIComponent(code);
  }, false);
  
  $play.addEventListener("click", function() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      cc.play();
      $play.className = "btn btn-danger";
      requestAnimationFrame(animate);
    } else {
      $play.className = "btn";
      cc.pause();
    }
  }, false);
  
  var animate = (function() {
    var canvas = document.getElementById("canvas");
    canvas.width  = 1024;
    canvas.height = 120;
    
    var context = canvas.getContext("2d");
    context.fillStyle   = "#ecf0f1";
    context.strokeStyle = "#2980b9";
    context.lineWidth   = 8;
    context.lineJoin    = "round";
    var calcY = function(val) {
      return val * 0.45 * canvas.height + (canvas.height * 0.5);
    };

    var strm = cc.getStream();
    var prevt = 0;
    return function(t) {
      if (isPlaying) {
        if (t - prevt > 60) {
          var len  = strm.length * 0.5;
          var imax = 256;
          var dx   = canvas.width / imax;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.beginPath();
          context.moveTo(0, calcY((strm[0]+strm[len])*0.5));
          for (var i = 0; i < imax; i++) {
            context.lineTo(i * dx, calcY((strm[i]+strm[i+len])*0.5));
          }
          context.lineTo(canvas.width, calcY((strm[imax-1]+strm[len+imax-1])*0.5));
          context.stroke();
          prevt = t;
        }
        requestAnimationFrame(animate);
      } else {
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  })();

  var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.indexOf(srcFragment) === 0) {
    $code.value = hash.substr(srcFragment.length);
  }
};
