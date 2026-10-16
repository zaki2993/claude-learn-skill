// fixedA + rateA*m = fixedB + rateB*m
// → take rateA*m and fixedB off both sides: fixedA - fixedB = (rateB - rateA) * m
// → divide by (rateB - rateA). If that is 0, the lines never meet (or always do).
function breakEven(fixedA, rateA, fixedB, rateB) {
  if (rateA === rateB) return null;
  return (fixedA - fixedB) / (rateB - rateA);
}

module.exports = { breakEven };
