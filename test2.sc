@incl std/io/log

@incl fibs/push
@incl fibs/at
uint: fn fibonnaci(uint: n) do
  uint[]: mut fibs = [0, 1]
  uint: mut i;

  for: i = 2, i < n + 1, i++ do
    fibs:push(fibs:at(-1) + fibs:at(-2))
  end

  return fibs
end

@incl performance/now
uint: fn main() do
  float[]: mut avgTime = [0, 0, 0, 0, 0, 0, 0, 0];
  str[]: strs = ["Ten", "Thirty", "Fourty-five", "Fifty-five", "Seventy", "One-thousand", "Ten-thousand", "One-hundred-thousand"]
  uint: iters = 5000;
  uint[]: iterations = [10, 30, 45, 55, 70, 1000, 10000, 100000] 

  uint: mut ptr = 0;
  uint: mut i;

  for: ptr = 0, ptr < 8, ptr++ do
    for: i = 0, i < iters, i++ do
      float: startTime = performance:now();
      fibonnaci(iterations[ptr])
      float: elapsed = performance:now() - startTime;
      avgTime[ptr] = avgTime[ptr] + elapsed
    end
  end


  return 0
end


