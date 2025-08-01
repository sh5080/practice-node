export function do369(n: number): number | string {
  let clap = false;
  let clapCount = 0;
  let originalNumber = n;
  
  while (n) {
    let lastNum = Math.floor(n % 10);
    clap =
      lastNum === 3
        ? true
        : lastNum === 6
        ? true
        : lastNum === 9
        ? true
        : false;

    clap ? clapCount++ : null;
    n = Math.floor(n / 10);

    if (n < 1) break;
  }

  return clapCount > 0 ? "clap".repeat(clapCount) : originalNumber;
}
