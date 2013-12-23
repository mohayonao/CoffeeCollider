(
  $scale = Scale.major.degrees()
  $freq  = -> ($scale.choose() + [C3,C4,C5,C6].choose()).midicps()

  $synth = ->
    Pan2.ar(LFTri.ar($freq.value(), mul:0.08) *
      EnvGen.kr(Env.sine("bpm40 l1."), doneAction:2), 1.rand2())
)

(
  $t = Task ->
    16.do syncblock ->
      8.do -> $synth.play()
      "bpm40 l1".wait()

  $t.start()
)
