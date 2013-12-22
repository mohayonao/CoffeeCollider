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
    @editor.getSession().setTabSize 2
    @editor.setSelectionStyle 'text'
    @setLangType 'coffee'

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
    
  setSourceCode: (code, lang='coffee')->
    @editor.setValue code
    @editor.clearSelection()
    @editor.moveCursorTo 0, 0
    @editor.moveCursorToPosition 0
    @setLangType lang
      
  setLangType: (lang)->
    @editor.getSession().setMode "ace/mode/#{lang}"
  
  getSmartRegion: ->
    session = @editor.session
    range   = @editor.getSelectionRange()
    if range.isEmpty()
      @editor.getSelection().setSelectionRange(
        new Range(range.start.row, 0, range.start.row, Infinity)
      )
    @blink '.ace_marker-layer .ace_selection', =>
      @editor.getSelection().setSelectionRange range
    session.getTextRange @editor.getSelectionRange()

  blink: (selector, callback)->
    rule = getCssRule selector
    if rule
      setTimeout ->
        rule.style.setProperty '-webkit-animation', null
        callback()
      , 250
      rule.style.setProperty '-webkit-animation', 'blink 0.5s'
