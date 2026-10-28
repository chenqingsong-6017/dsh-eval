export async function runSteps(steps) {
  return Promise.all(steps.map((step) => step()))
}
