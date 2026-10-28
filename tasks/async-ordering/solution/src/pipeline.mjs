export async function runSteps(steps) {
  const results = []
  for (const step of steps) {
    results.push(await step())
  }
  return results
}
