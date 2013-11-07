tmp = Synth.def (freq=440, amp=1, opts={})->
  osc = opts.create(freq)
  Out.ar(0, osc * amp)

def1 = tmp.build create: (freq)-> SinOsc.ar(freq)
def2 = tmp.build create: (freq)-> LFSaw.ar(freq)


def1.play freq:880
def2.play freq:660
