Range = ace.require('ace/range').Range

getCssRule = do ->
  cache = {}
  (selector)->
    sheets = [].slice.call document.styleSheets
    sheets.forEach (sheet)->
      rules = [].slice.call sheet.cssRules ? sheet.rules
      rules.forEach (rule)->
        if rule.selectorText and rule.selectorText.indexOf(selector) isnt -1
          cache[selector] = rule
    cache[selector]

window.Editor = class Editor
  constructor: (id)->
    @editor = ace.edit id
    @editor.setTheme 'ace/theme/github'
    @editor.setPrintMarginColumn -1
    @editor.setSelectionStyle 'text'
    @editor.session.setTabSize 2
    @editor.session.setUseWrapMode true
    @editor.session.setMode 'ace/mode/coffee'
    
    @editor.commands.addCommand
      bindKey: mac:'Command+Enter', win:'Alt+Enter'
      name: 'run', exec: => @_callback['run']?()
    @editor.commands.addCommand
      bindKey: mac:'Command+.', win:'Alt+.'
      name: 'reset', exec: => @_callback['reset']?()

    @_callback = {}

  on: (event, callback)->
    @_callback[event] = callback

  getValue: ->
    @editor.getValue().trim()
  
  clear: ->
    @editor.setValue ''
    
  setSourceCode: (code)->
    @editor.setValue code
    @editor.clearSelection()
    @editor.moveCursorTo 0, 0
      
  getSmartRegion: ->
    session = @editor.session
    range   = @editor.getSelectionRange()
    if range.isEmpty()
      [begin, end] = @findRange session, range.start.row
      if begin isnt null
        @editor.getSelection().setSelectionRange(
          new Range(begin, 0, end, Infinity)
        )
    @blink '.ace_marker-layer .ace_selection', =>
      @editor.getSelection().setSelectionRange range
    session.getTextRange @editor.getSelectionRange()

  findRange: (session, begin)->
    lookAt = begin
    end    = begin
    last   = session.getLength()
    depth  = 0
    loop
      line = session.getLine lookAt
      for i in [0...line.length]
        switch line.charAt(i)
          when "(", "[", "{" then depth += 1
          when "}", "]", ")" then depth -= 1
      if depth is 0
        code = session.getLines(begin, end).join '\n'
        break
      else if depth < 0
        begin -= 1
        if begin < 0 then break
        lookAt = begin
      else
        end += 1
        if end > last then break
        lookAt = end
    if code
      try
        CoffeeScript.tokens code
        return [ begin, end ]
      catch e
        console.log e.toString()
    [ null, null ]
  
  blink: (selector, callback)->
    rule = getCssRule selector
    if rule
      setTimeout ->
        rule.style.setProperty '-webkit-animation', null
        callback()
      , 250
      rule.style.setProperty '-webkit-animation', 'blink 0.5s'
