$(function() {
  "use strict";
  
  var isEdge = /extras\/edge/.test(location.href);
  
  var srcFragment  = "try:";
  var loadFragment = "load:";
  var $boot = $("#boot");
  
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/github");
  editor.setPrintMarginColumn(-1);
  editor.getSession().setTabSize(2);
  editor.getSession().setMode("ace/mode/coffee");
  editor.setSelectionStyle("text");
  
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
  var status = "pause";
  
  var changeFavicon;
  if (isEdge) {
    changeFavicon = function(mode) {
      $("#favicon").attr({href:"../img/" + mode + ".gif"});
    };
  } else {
    changeFavicon = function(mode) {
      $("#favicon").attr({href:"./extras/img/" + mode + ".gif"});
    };
  }
  
  $boot.on("click", function(e) {
    if (status === "pause") {
      cc.play();
      viewer.start();
      $boot.addClass("btn-danger");
      status = "play";
      changeFavicon("play");
    } else {
      cc.pause();
      viewer.stop();
      $boot.removeClass("btn-danger");
      status = "pause";
      changeFavicon("pause");
    }
  });
  
  $("#run").on("click", function() {
    var code;
    if (isCoffee) {
      code = editor.getValue().trim();
    } else {
      code = coffeeSource;
    }
    cc.execute(code, function(res) {
      if (res !== undefined) {
        console.log(res);
      }
    });
  });
  
  $("#reset").on("click", function() {
    cc.reset();
  });

  $("#link").on("click", function() {
    var code = editor.getValue().trim();
    window.location = "#" + srcFragment + encodeURIComponent(code);
  });
  
  $("a", "#example-list").each(function(i, a) {
    var $a = $(a);
    $a.on("click", function() {
      window.location = "#" + loadFragment + $(this).attr("data-path");
      return false;
    });
  });
  
  $("#version").text(cc.version);

  var isCoffee = true, coffeeSource = "";
  $("#compile-js").on("click", function() {
    var jsSource = "";
    isCoffee = !isCoffee;
    if (isCoffee) {
      editor.setReadOnly(false);
      editor.setValue(coffeeSource);
      editor.getSession().setMode("ace/mode/coffee");
    } else {
      coffeeSource = editor.getValue().trim();
      jsSource     = cc.compile(coffeeSource);
      editor.setValue(jsSource);
      editor.setReadOnly(true);
      editor.getSession().setMode("ace/mode/javascript");
    }
    editor.clearSelection();
  });
  
  window.onhashchange = function() {
    var hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hash.indexOf(srcFragment) === 0) {
      editor.setValue(hash.substr(srcFragment.length));
      editor.clearSelection();
    } else if (hash.indexOf(loadFragment) === 0) {
      var path = "./examples/";
      if (isEdge) {
        path = "../../examples/";
      }
      $.get(path + hash.substr(loadFragment.length)).then(function(res) {
        editor.setValue(res);
        editor.clearSelection();
      });
    }
  };
  
  window.onhashchange();
  
  editor.focus();

});
