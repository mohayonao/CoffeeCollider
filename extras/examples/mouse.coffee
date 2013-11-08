SynthDef ->
  freq = MouseY.kr(100, 1000, "exponential")
  freq1 = freq * MouseX.kr(2, 0.5, lag:2.5)
  freq2 = freq * MouseX.kr(0.5, 2, lag:2.5)
  feedback = MouseButton.kr(0, 1.pi(), lag:5)
  osc = SinOscFB.ar([freq1, freq2], feedback)
  Out.ar(0, osc)
.play()
