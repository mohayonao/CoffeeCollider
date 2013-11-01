$(function() {
  "use strict";
  
  var srcFragment = "try:";
  var $code = $("#code");
  var $play = $("#play");
  
  var config = {};
  location.search.substr(1).split("&").forEach(function(kv) {
    var items = kv.split("=");
    if (items[0] != "") {
      var key   = items[0];
      var value = items[1];
      if (value == "false") {
        value = false;
      } else if (value == "true" || value == undefined) {
        value = true;
      } else if (!isNaN(+value)) {
        value = +value;
      }
      config[key] = value;
    }
  });
  
  var cc = window.cc = new CoffeeCollider(config);
  var viewer = new WaveViewer(cc, document.getElementById("canvas"), {
    width:200, height:100, fillStyle:"#2c3e50", strokeStyle:"#f1c40f", lineWidth:2
  });
  var isPlaying = false;
  var prevCode  = null;
  var status = "pause";
  
  $play.on("click", function(e) {
    if (e.shiftKey) {
      console.log(cc.impl.compiler.toString($code.val().trim()));
      return;
    }
    
    execute();
    if (status === "pause") {
      cc.play();
      viewer.start();
      $play.addClass("btn-danger").text("Run");
      status = "play";
      isPlaying = true;
    }
  });
  
  var execute = function() {
    var code = $code.val().trim();
    cc.execute(code, function(res) {
      if (res !== undefined) {
        console.log(res);
      }
    });
    prevCode = code;
  };

  $("#pause").on("click", function() {
    if (status === "play") {
      cc.pause();
      viewer.stop();
      $play.removeClass("btn-danger").text("Play");
      status = "pause";
      isPlaying = false;
    }
  });
  
  $("#link").on("click", function() {
    var code = $code.val().trim();
    window.location = "#" + srcFragment + encodeURIComponent(code);
  });

  $("a", "#example-list").each(function(i, a) {
    var $a = $(a);
    $a.on("click", function() {
      $.get("./examples/" + $(this).attr("data-path")).then(function(res) {
        $code.val(res);
      });
      return false;
    });
  });
  
  var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.indexOf(srcFragment) === 0) {
    $code.val(hash.substr(srcFragment.length));
  }

});
