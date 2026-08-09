export const RIM_OFFSET_DIRECTIONS = {
  DRIVE: 'drive',
  NON_DRIVE: 'non-drive',
}

export const LIMITS = {
  erd: { min: 100, max: 1000 },
  pcd: { min: 10, max: 300 },
  flangeDistance: { min: 0, max: 150 },
  rimOffset: { min: 0, max: 30 },
}

export function normalizeDecimalInput(value) {
  if (typeof value === 'number') return value.toString()
  return String(value ?? '').trim().replace(',', '.')
}

export function parseDecimal(value) {
  const normalized = normalizeDecimalInput(value)
  if (normalized === '') return Number.NaN
  return Number(normalized)
}

export function validateMeasurement(value, { label, min, max }) {
  const parsed = parseDecimal(value)

  if (!Number.isFinite(parsed)) {
    return {
      valid: false,
      message: `Please enter a valid number for ${label}. You can use a dot or comma for decimals.`,
    }
  }

  if (parsed < min || parsed > max) {
    return {
      valid: false,
      message: `${label} must be between ${min} and ${max} mm.`,
    }
  }

  return { valid: true, value: parsed }
}

export function validateErd(value) {
  return validateMeasurement(value, { label: 'ERD', ...LIMITS.erd })
}

export function validatePcd(value, side) {
  return validateMeasurement(value, { label: `${side} PCD`, ...LIMITS.pcd })
}

export function validateFlangeDistance(value, side) {
  return validateMeasurement(value, {
    label: `${side} flange distance`,
    ...LIMITS.flangeDistance,
  })
}

export function validateRimOffset(value) {
  return validateMeasurement(value, { label: 'Rim offset', ...LIMITS.rimOffset })
}

export function validateWheel(wheel) {
  if (!wheel || !Number.isInteger(wheel.holes) || wheel.holes < 2 || wheel.holes % 2 !== 0) {
    return { valid: false, message: 'The number of spoke holes must be a positive even number.' }
  }

  if (!Number.isInteger(wheel.crosses) || wheel.crosses < 0) {
    return { valid: false, message: 'The number of crosses must be zero or greater.' }
  }

  const checks = [
    validateErd(wheel.erd),
    validatePcd(wheel.leftPcd, 'Left'),
    validatePcd(wheel.rightPcd, 'Right'),
    validateFlangeDistance(wheel.leftFlangeDistance, 'Left'),
    validateFlangeDistance(wheel.rightFlangeDistance, 'Right'),
    validateRimOffset(wheel.rimOffset ?? 0),
  ]

  const failed = checks.find((check) => !check.valid)
  if (failed) return failed

  if (wheel.leftPcd >= wheel.erd || wheel.rightPcd >= wheel.erd) {
    return { valid: false, message: 'PCD must be smaller than ERD.' }
  }

  if (!Object.values(RIM_OFFSET_DIRECTIONS).includes(wheel.rimOffsetDirection)) {
    return { valid: false, message: 'Select the direction of the rim offset.' }
  }

  const maxCrosses = Math.max(0, Math.floor(wheel.holes / 4) - 1)
  if (wheel.crosses > maxCrosses) {
    return { valid: false, message: `Too many crosses for a ${wheel.holes}-hole wheel.` }
  }

  return { valid: true }
}

export function calculateSpokeLength({ erd, pcd, flangeDistance, crosses, holes }) {
  const angle = (2 * Math.PI * crosses) / (holes / 2)

  return Math.sqrt(
    Math.pow(erd / 2, 2) +
      Math.pow(pcd / 2, 2) -
      2 * (erd / 2) * (pcd / 2) * Math.cos(angle) +
      Math.pow(flangeDistance, 2),
  )
}

export function getAdjustedFlangeDistances(wheel) {
  const offset = wheel.rimOffset ?? 0
  const signedOffset =
    wheel.rimOffsetDirection === RIM_OFFSET_DIRECTIONS.NON_DRIVE ? -offset : offset

  return {
    left: wheel.leftFlangeDistance + signedOffset,
    right: wheel.rightFlangeDistance - signedOffset,
  }
}

export function roundToTenth(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

export function calculateWheelSpokes(wheel) {
  const validation = validateWheel(wheel)
  if (!validation.valid) throw new Error(validation.message)

  const flangeDistances = getAdjustedFlangeDistances(wheel)
  const left = calculateSpokeLength({
    erd: wheel.erd,
    pcd: wheel.leftPcd,
    flangeDistance: flangeDistances.left,
    crosses: wheel.crosses,
    holes: wheel.holes,
  })
  const right = calculateSpokeLength({
    erd: wheel.erd,
    pcd: wheel.rightPcd,
    flangeDistance: flangeDistances.right,
    crosses: wheel.crosses,
    holes: wheel.holes,
  })

  return {
    left,
    right,
    leftRounded: roundToTenth(left),
    rightRounded: roundToTenth(right),
  }
}
