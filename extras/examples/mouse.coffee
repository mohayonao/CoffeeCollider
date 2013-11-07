SynthDef ->
  freq = MouseY.kr(1760, 220, "exponential")
  mod  = SinOsc.ar(freq * MouseButton.kr(1, 2, lag:1))
  mod *= MouseX.kr(0, 20, "exponential")
  out  = SinOsc.ar([freq, freq*1.01], phase:mod)
  Out.ar(0, out * 0.4)
.play()
