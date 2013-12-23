window.WaveViewer = class WaveViewer
  constructor: (@cc, @canvas, opts={})->
    @canvas.width  = opts.width  ? 1024
    @canvas.height = opts.height ?  120
    @context = @canvas.getContext '2d'
    @context.fillStyle   = opts.fillStyle   ? 'white'
    @context.strokeStyle = opts.strokeStyle ? 'gray'
    @context.lineWidth   = opts.lineWidth   ? 2
    @context.lineJoin    = 'round'
    @t = 0
    @isPlaying = false

  start: ->
    @isPlaying = true
    requestAnimationFrame (t)=> @animate t

  stop: ->
    @isPlaying = false

  animate: (t)->
    if @isPlaying
      if t - @t > 60
        context = @context
        strm  = @cc.getStream()
        strmL = strm.getChannelData 0
        strmR = strm.getChannelData 1
        len   = strm.length * 0.5
        imax  = 256
        dx    = @canvas.width / imax
        context.fillRect 0, 0, @canvas.width, @canvas.height
        context.beginPath()
        context.moveTo 0, @_calcY (strmL[0]+strmR[0]) * 0.5
        for i in [1...imax]
          context.lineTo i * dx, @_calcY (strmL[i]+strmR[i]) * 0.5
        context.lineTo @width, @_calcY (strmL[imax-1]+strmR[imax-1]) * 0.5
        context.stroke()
        @t = t
      requestAnimationFrame (t)=> @animate t
    else
      @context.fillRect 0, 0, @canvas.width, @canvas.height
  
  _calcY: (val)-> -val * 0.45 * @canvas.height + (@canvas.height * 0.5)
