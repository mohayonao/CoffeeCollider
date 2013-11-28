b = Buffer.read("/files/audio/Grange_Party.mp3")
  
(->
  Mix(PlayBuf.ar(2, b, rate:[1, 0.975], loop:1))
).play()
