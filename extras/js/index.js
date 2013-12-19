$(function() {
  "use strict";
  
  var isEdge = /extras\/edge/.test(location.href);
  
  var srcFragment  = "try:";
  var gistFragment = "gist:";
  var $keyboard = $("#keyboard");
  
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
  
  var showKeyboard = function(code) {
    if (/Message\.on\(?\s*"keyboard"/.test(code)) {
      $keyboard.show(500);
    } else {
      $keyboard.hide(500);
    }
  };
  
  var cc = window.cc = new CoffeeCollider(config);
  cc.on("play", function() {
    viewer.start();
    $("#run").addClass("btn-danger");
    changeFavicon("play");
  });
  cc.on("pause", function() {
    viewer.stop();
    $("#run").removeClass("btn-danger");
    changeFavicon("pause");
  });
  
  var viewer = new WaveViewer(cc, document.getElementById("canvas"), {
    width:200, height:100, fillStyle:"#2c3e50", strokeStyle:"#f1c40f", lineWidth:2
  });
  
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
    }).play();
    showKeyboard(code);
  });
  
  $("#stop").on("click", function() {
    cc.reset().pause();
  });
  
  $("#link").on("click", function() {
    var code;
    if (isCoffee) {
      code = editor.getValue().trim();
    } else {
      code = coffeeSource;
    }
    window.location = "#" + srcFragment + encodeURIComponent(code);
  });
  
  $("a", "#example-list").each(function(i, a) {
    var $a = $(a);
    $a.on("click", function() {
      window.location = "#" + $(this).attr("data-path");
      return false;
    });
  });
  
  $("#version").text(cc.version);

  var isCoffee = true, coffeeSource = "";
  $("#compile").on("click", function() {
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
    var code, gistid, path;
    if (hash.indexOf(srcFragment) === 0) {
      code = hash.substr(srcFragment.length);
      editor.setValue(code);
      editor.clearSelection();
      showKeyboard(code);
    } else if (hash.indexOf(gistFragment) === 0) {
      gistid = hash.substr(gistFragment.length);
      $.ajax({
        url:"https://api.github.com/gists/" + gistid,
        type:"GET", dataType:"jsonp"
      }).success(function(data) {
        data = data.data.files;
        code = "";
        Object.keys(data).forEach(function(key) {
          if (data[key].language === "CoffeeScript") {
            code += data[key].content;
          }
        });
        editor.setValue(code);
        editor.clearSelection();
        editor.moveCursorTo(0, 0);
        editor.moveCursorToPosition(0);
        showKeyboard(code);
      });
    } else if (/.+\.coffee$/.test(hash)) {
      path = "./examples/";
      if (isEdge) {
        path = "../../examples/";
      }
      $.get(path + hash).then(function(res) {
        code = res;
        editor.setValue(code);
        editor.clearSelection();
        editor.moveCursorTo(0, 0);
        editor.moveCursorToPosition(0);
        showKeyboard(code);
      });
    }
  };
  
  window.onhashchange();
  
  editor.focus();

  // keyboard ui
  (function() {
    var canvas  = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var width   = 218;
    var height  =  79;
    var w_keyCount = 14;
    var w_keyWidth = width / 14;
    var b_keyWidth = w_keyWidth * 0.75;
    var w_keys = [], b_keys = [], keys;
    var midi = 60;
    
    var i, j, x, y, w, h;
    canvas.width  = width;
    canvas.height = height;
    
    for (i = 0; i < w_keyCount; ++i) {
      w = w_keyWidth;
      h = height - 1;
      x = i * w;
      y = 0;
      w_keys.push({ x1:x, x2:x+w, w:w, y1:0, y2:y+h, h:h, midi:midi++ });
      
      if ([0, 1, 3, 4, 5].indexOf(i % 7) !== -1) {
        w = b_keyWidth;
        h = height * 0.6;
        x = (x + w_keyWidth) - (w * 0.5);
        y = 0;
        b_keys.push({ x1:x, x2:x+w, w:w, y1:0, y2:y+h, h:h, midi:midi++ });
      }
    }
    keys = b_keys.concat(w_keys);
    
    w_keys.forEach(function(key) {
      context.fillStyle   = "#ffffff";
      context.strokeStyle = "#95a5a6";
      context.fillRect(key.x1, key.y1, key.w, key.h);
      context.strokeRect(key.x1, key.y1, key.w, key.h);
    });
    b_keys.forEach(function(key) {
      context.fillStyle = "#2c3e50";
      context.fillRect(key.x1, key.y1, key.w, key.h);
    });

    var getPos = function(e) {
      var offset = $(canvas).offset();
      return { x:e.pageX-offset.left, y: e.pageY-offset.top };
    };
    var findKey = function(pos) {
      for (var i = 0; i < keys.length; ++i) {
        if (keys[i].x1 <= pos.x && pos.x < keys[i].x2) {
          if (keys[i].y1 <= pos.y && pos.y < keys[i].y2) {
            return keys[i];
          }
        }
      }
    };
    var isMouseDown = false;
    var currentKey  = null;
    
    $(canvas).on("mousedown", function(e) {
      isMouseDown = true;
      var key = findKey(getPos(e));
      cc.send("keyboard", {midi:key.midi, gate:1});
      currentKey = key;
    }).on("mousemove", function(e) {
      if (isMouseDown && currentKey) {
        var key = findKey(getPos(e));
        if (currentKey !== key) {
          cc.send("keyboard", {midi:currentKey.midi, gate:0});
          cc.send("keyboard", {midi:key.midi, gate:1});
          currentKey = key;
        }
      }
    }).on("mouseup", function(e) {
      if (currentKey) {
        cc.send("keyboard", {midi:currentKey.midi, gate:0});
      }
      isMouseDown = false;
    }).on("mouseout", function(e) {
      if (currentKey) {
        cc.send("keyboard", {midi:currentKey.midi, gate:0});
      }
    }).css({width:width, height:height}).appendTo($keyboard);
  })();

});
