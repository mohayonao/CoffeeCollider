# inspired by http://d.hatena.ne.jp/aike/20120723

tone = SynthDef (freq=440, amp=1)->
  amp *= Line.kr(0.25, 0, dur:0.5, doneAction:2)
  Out.ar(0, SinOscFB.ar(freq, 0.5.pi()) * amp)
.build()

scale = for i in [0..20]
  Scale.dorian.degreeToFreq i, 62.midicps(), 1

arpeggiator = (x, y, z)->
  w = "bpm138 l16"
  freq = [ x, y, z ].sort()
  Task.each [ 0, 1, 2, 1, 0, 1, 2, 1 ], (i)->
    tone.play freq:freq[i]
    @wait w
    tone.play freq:freq[i] * 2
    @wait w
  .play()

bar = 0
Task.recursive (x, y, z)->
  console.log "#{bar++}: [#{x}, #{y}, #{z}]"
  @wait arpeggiator scale[x + 1], scale[y + 1], scale[z + 1]
  
  if x <= y
    @return y

  nextX = @recursive x-1, y, z
  nextY = @recursive y-1, z, x
  nextZ = @recursive z-1, x, y
  @return @recursive nextX, nextY, nextZ

.play 10, 5, 0
