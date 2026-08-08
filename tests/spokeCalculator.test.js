import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RIM_OFFSET_DIRECTIONS,
  calculateSpokeLength,
  calculateWheelSpokes,
  parseDecimal,
  validateErd,
} from '../src/utils/spokeCalculator.js'

test('keeps the 32-hole, 3-cross calculation unchanged', () => {
  const length = calculateSpokeLength({
    erd: 600,
    pcd: 58,
    flangeDistance: 35,
    crosses: 3,
    holes: 32,
  })

  assert.equal(length.toFixed(1), '292.2')
})

test('keeps radial calculations unchanged', () => {
  const length = calculateSpokeLength({
    erd: 600,
    pcd: 58,
    flangeDistance: 35,
    crosses: 0,
    holes: 32,
  })

  assert.equal(length.toFixed(1), '273.3')
})

test('calculates both sides of an asymmetric wheel', () => {
  const result = calculateWheelSpokes({
    holes: 32,
    erd: 600,
    rimOffset: 2.5,
    rimOffsetDirection: RIM_OFFSET_DIRECTIONS.DRIVE,
    leftPcd: 58,
    rightPcd: 58,
    leftFlangeDistance: 35,
    rightFlangeDistance: 20,
    crosses: 3,
  })

  assert.equal(result.leftRounded, 292.6)
  assert.equal(result.rightRounded, 290.7)
})

test('accepts comma as decimal separator', () => {
  assert.equal(parseDecimal('35,5'), 35.5)
})

test('rejects invalid ERD values', () => {
  assert.equal(validateErd('').valid, false)
  assert.equal(validateErd('-600').valid, false)
})
