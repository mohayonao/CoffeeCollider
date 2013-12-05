Task ->
  count = 0
  Infinity.do syncblock ->
    count += 1
    switch 0
      when count % 15
        console.log "#{count} FizzBuzz"
      when count % 5
        console.log "#{count} Buzz"
      when count % 3
        console.log "#{count} Fizz"
      else
        console.log count
    1.wait()
.start()
