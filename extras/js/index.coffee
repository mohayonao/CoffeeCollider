$ ->
  isEdgeVer = /extras\/edge/.test location.href
  
  config = do ->
    config = {}
    location.search.substr(1).split('&').forEach (kv)->
      [key, value] = kv.split '='
      if key
        if value is 'false'
          value = false
        else if value is 'true' or value is undefined
          value = true
        else if not isNaN +value
          value = +value
        config[key] = value
    config
  
  cc = window.cc = new CoffeeCollider(config)
  
  viewer   = new WaveViewer cc, document.getElementById('canvas'),
    width:200, height:100, fillStyle:'#2c3e50', strokeStyle:'#f1c40f', lineWidth:2
  editor   = new Editor('editor')
  keyboard = new Keyboard($('#keyboard'))
  
  run = (code, append)->
    cc.run code, append, (res)-> console.log res if res
    
  changeFavicon = (mode)->
    path = if isEdgeVer then '..' else './extras'
    $('#favicon').attr href: "#{path}/img/#{mode}.gif"
  
  showKeyboard = (code)->
    if /Message\.on\(?\s*"keyboard"/.test code
      keyboard.show 500
    else
      keyboard.hide 500
  
  cc.on 'play', ->
    viewer.start()
    $('#run').addClass 'btn-danger'
    changeFavicon 'play'

  cc.on 'pause', ->
    viewer.stop()
    $('#run').removeClass 'btn-danger'
    changeFavicon 'pause'

  editor.on 'run', ->
    [code, append] = [ editor.getSmartRegion(), true ]
    if code
      run code, append
  
  editor.on 'reset', ->
    cc.reset().pause()

  keyboard.on 'key', (data)->
    cc.send 'keyboard', data
  
  $('#run').on 'click', (e)->
    if e.shiftKey
      [code, append] = [ editor.getSmartRegion(), true ]
    else
      [code, append] = [ editor.getValue(), true ]
    if code
      run code, append
      showKeyboard code
  
  $('#stop').on 'click', ->
    cc.reset().pause()

  $('#clear').on 'click', ->
    editor.clear()

  $('#link').on 'click', ->
    window.location = "##{srcFragment}#{encodeURIComponent(editor.getValue())}"
      
  $('#version').text cc.version
  
  
  srcFragment  = 'try:'
  gistFragment = 'gist:'
  
  window.onhashchange = ->
    hash = location.hash.replace /^\#/, ''
    switch
      when hash.indexOf(srcFragment) is 0
        readFromLink hash.substr(srcFragment.length), (code)->
          editor.setSourceCode code
          showKeyboard code
      when hash.indexOf(gistFragment) is 0
        readFromGist hash.substr(gistFragment.length), (code)->
          editor.setSourceCode code
          showKeyboard code
      when /.+\.coffee$/.test hash
        readFromExample hash, (code)->
          editor.setSourceCode code
          showKeyboard code
  
  readFromLink = (link, callback)->
    code = decodeURIComponent link
    callback code
  
  readFromGist = (gistid, callback)->
    url = "https://api.github.com/gists/#{gistid}"
    $.ajax(url:url, type:'GET', dataType:'jsonp').then ({data})->
      files = data.files
      code  = Object.keys(files).filter (key)->
        files[key].language is 'CoffeeScript'
      .map (key)->
        files[key].content
      .join '\n'
      callback code
  
  readFromExample = (filename, callback)->
    path = "./examples/#{filename}"
    path = "../.#{path}" if isEdgeVer
    $.get(path).then (code)->
      callback code

  window.onhashchange()

  window.showCompile = ->
    console.log cc.compile(editor.getValue())
