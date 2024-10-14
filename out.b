
type uint = number
type int = number
type bool = boolean
type str = string
type float = number






function fibonnaci(n: uint): uint {
  let fibs: uint[] = [ 0, 1 ]

  let i: uint
  for (i = 2; i < n + 1; i++) {
   fibs.push(fibs.at(-1) + fibs.at(-2)) 
  }

  return fibs
}


function old_fib(n: uint): uint {
  if (n == 0) {
    return 0 
  } else if (n <= 2) {
    return 1 
  }
  return old_fib(n - 1) + old_fib(n - 2)
}






function old(): uint {
  let avgTime: float = 0
  const startTime: float = performance.now()
  old_fib(45)
  const elapsed: float = performance.now() - startTime
  avgTime = avgTime + elapsed
  const avg_ms: float = avgTime / 1000
  console.log("Fourty-five (OLD)", avg_ms.toFixed(3), "s")
}


function main(): uint {
  let avgTime: float[] = [ 0, 0, 0, 0, 0, 0, 0, 0 ]

  const strs: str[] = [ "Ten", "Thirty", "Fourty-five", "Fifty-five", "Seventy", "One-thousand", "Ten-thousand", "One-hundred-thousand" ]

  const iters: uint = 5000
  const iterations: uint[] = [ 10, 30, 45, 55, 70, 1000, 10000, 100000 ]

  let ptr: uint = 0
  let i: uint
  for (ptr = 0; ptr < 8; ptr++) {
   for (i = 0; i < iters; i++) {
   const startTime: float = performance.now()
  fibonnaci(iterations[ptr])
  const elapsed: float = performance.now() - startTime
  avgTime[ptr] = avgTime[ptr] + elapsed 
  }
 
  }

  for (ptr = 0; ptr < 8; ptr++) {
   const avg: float = avgTime[ptr] / iters
  const avg_ms: float = avg * 1000
  console.log(strs[ptr], avg_ms.toFixed(3), "ms") 
  }

  console.log("------------------------------")
  old()
  return 0
}

process.exit(main(process.argv))