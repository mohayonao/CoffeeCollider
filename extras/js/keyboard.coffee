window.Keyboard = class Keyboard
  constructor: (@elem)->
    @canvas  = document.createElement 'canvas'
    @context = @canvas.getContext '2d'
    @canvas.width  = @width  = 218
    @canvas.height = @height =  79
    
    @keys      = build @context, @width, @height
    @_callback = {}
    
    isMouseDown = false
    currentKey  = null
    
    $(@canvas).css(width:@width, height:@height).appendTo @elem
    
    $(@canvas).on 'mousedown', (e)=>
      isMouseDown = true
      key = @_findKey e
      if key
        @_callback['key']? midi:key.midi, gate:1
        currentKey = key
      false
        
    $(@canvas).on 'mousemove', (e)=>
      if isMouseDown and currentKey
        key = @_findKey e
        if key and currentKey isnt key
          @_callback['key']? midi:currentKey.midi, gate:0
          @_callback['key']? midi:key.midi       , gate:1
          currentKey = key
      false

    $(@canvas).on 'mouseup', (e)=>
      if currentKey
        @_callback['key']? midi:currentKey.midi, gate:0
      isMouseDown = false
      false
    
    $(@canvas).on 'mouseout', (e)=>
      if currentKey
        @_callback['key']? midi:currentKey.midi, gate:0
      isMouseDown = false
      false
  
  _findKey: (e)->
    offset = $(@canvas).offset()
    pos = x:e.pageX-offset.left, y:e.pageY-offset.top

    for i in [0...@keys.length]
      if @keys[i].x1 <= pos.x < @keys[i].x2 and @keys[i].y1 <= pos.y < @keys[i].y2
        return @keys[i]
    
  on: (event, callback)->
    @_callback[event] = callback

  show: (time)->
    @elem.show time
    
  hide: (time)->
    @elem.hide time
  
  build = (context, width, height)->
    w_keyCount = 14
    w_keyWidth = width / 14
    b_keyWidth = w_keyWidth * 0.75
    w_keys = []
    b_keys = []
    midi = 60

    for i in [0...w_keyCount]
      w = w_keyWidth
      h = height - 1
      x = i * w
      y = 0
      w_keys.push x1:x, x2:x+w, w:w, y1:0, y2:y+h, h:h, midi:midi++
      if [0, 1, 3, 4, 5].indexOf(i % 7) isnt -1
        w = b_keyWidth
        h = height * 0.6
        x = (x + w_keyWidth) - (w * 0.5)
        y = 0
        b_keys.push x1:x, x2:x+w, w:w, y1:0, y2:y+h, h:h, midi:midi++
    keys = b_keys.concat w_keys

    w_keys.forEach (key)->
      context.fillStyle   = "#ffffff";
      context.strokeStyle = "#95a5a6";
      context.fillRect   key.x1, key.y1, key.w, key.h
      context.strokeRect key.x1, key.y1, key.w, key.h
    b_keys.forEach (key)->
      context.fillStyle = "#2c3e50";
      context.fillRect key.x1, key.y1, key.w, key.h
    keys
