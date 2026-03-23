export interface ConstraintResult {
  passed: boolean
  constraintName: string
  explanation: string
}

export interface ConstraintReport {
  allPassed: boolean
  results: ConstraintResult[]
  /** Ready-to-display list of satisfied constraint explanations */
  satisfied: string[]
  /** Ready-to-display list of failed constraint explanations */
  violations: string[]
}

export function buildConstraintReport(results: ConstraintResult[]): ConstraintReport {
  const satisfied = results.filter((r) => r.passed).map((r) => r.explanation)
  const violations = results.filter((r) => !r.passed).map((r) => r.explanation)
  return {
    allPassed: violations.length === 0,
    results,
    satisfied,
    violations,
  }
}
