buffer = Buffer.read("/files/audio/amen.wav")
  
SynthDef ->
  rate = MouseX.kr(0.8, 1.2)
  Out.ar(0, PlayBuf.ar(1, buffer, rate:rate, loop:1))
.play()
