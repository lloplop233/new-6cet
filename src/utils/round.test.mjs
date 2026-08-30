import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { round } from './round.ts'

describe('round', () => {
  it('rounds to an integer by default', () => {
    assert.equal(round(1.5), 2)
  })

  it('rounds to the requested decimal precision', () => {
    assert.equal(round(12.3456, 2), 12.35)
  })

  it('supports negative precision', () => {
    assert.equal(round(145, -1), 150)
  })
})
