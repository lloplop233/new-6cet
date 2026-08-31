import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs } from 'ts-fsrs'

describe('FSRS dependency contract', () => {
  it('loads the scheduler through ESM', () => {
    assert.equal(typeof fsrs, 'function')
    assert.equal(createEmptyCard(new Date(0)).due.getTime(), 0)
  })

  it('runs on the declared Node.js baseline', () => {
    const major = Number.parseInt(process.versions.node.split('.')[0], 10)

    assert.ok(major >= 20)
  })
})
