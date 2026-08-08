import { useMemo, useRef, useState } from 'react'
import './App.css'
import {
  RIM_OFFSET_DIRECTIONS,
  calculateWheelSpokes,
  validateErd,
  validateFlangeDistance,
  validatePcd,
  validateRimOffset,
  validateWheel,
} from './utils/spokeCalculator.js'

const HOLE_OPTIONS = [16, 18, 20, 24, 28, 32, 36, 40, 48]
const CROSS_OPTIONS = [0, 1, 2, 3]
const STORAGE_KEY = 'spoke-calculator-wheels'

const INITIAL_FORM = {
  holes: '',
  erd: '',
  rimOffset: '0',
  rimOffsetDirection: RIM_OFFSET_DIRECTIONS.DRIVE,
  leftPcd: '',
  rightPcd: '',
  leftFlangeDistance: '',
  rightFlangeDistance: '',
  crosses: '',
}

function loadSavedWheels() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function Section({ title, subtitle, image, imageAlt, children }) {
  return (
    <section className="calculator-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {image ? (
        <div className="diagram-card">
          <img src={image} alt={imageAlt} />
        </div>
      ) : null}

      {children}
    </section>
  )
}

function MeasurementInput({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-with-unit">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <span className="unit">mm</span>
      </span>
    </label>
  )
}

function App() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [savedWheels, setSavedWheels] = useState(loadSavedWheels)
  const [showSaved, setShowSaved] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [rimName, setRimName] = useState('')
  const [hubName, setHubName] = useState('')
  const resultRef = useRef(null)

  const isSymmetric = useMemo(
    () => result && result.leftRounded === result.rightRounded,
    [result],
  )

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const buildWheel = () => {
    if (!form.holes) throw new Error('Please choose the number of holes.')
    if (form.crosses === '') throw new Error('Please choose the number of crosses.')

    const erd = validateErd(form.erd)
    if (!erd.valid) throw new Error(erd.message)

    const rimOffset = validateRimOffset(form.rimOffset)
    if (!rimOffset.valid) throw new Error(rimOffset.message)

    const leftPcd = validatePcd(form.leftPcd, 'Left')
    if (!leftPcd.valid) throw new Error(leftPcd.message)

    const rightPcd = validatePcd(form.rightPcd, 'Right')
    if (!rightPcd.valid) throw new Error(rightPcd.message)

    const leftFlangeDistance = validateFlangeDistance(
      form.leftFlangeDistance,
      'Left',
    )
    if (!leftFlangeDistance.valid) throw new Error(leftFlangeDistance.message)

    const rightFlangeDistance = validateFlangeDistance(
      form.rightFlangeDistance,
      'Right',
    )
    if (!rightFlangeDistance.valid) throw new Error(rightFlangeDistance.message)

    const wheel = {
      holes: Number(form.holes),
      erd: erd.value,
      rimOffset: rimOffset.value,
      rimOffsetDirection: form.rimOffsetDirection,
      leftPcd: leftPcd.value,
      rightPcd: rightPcd.value,
      leftFlangeDistance: leftFlangeDistance.value,
      rightFlangeDistance: rightFlangeDistance.value,
      crosses: Number(form.crosses),
    }

    const validation = validateWheel(wheel)
    if (!validation.valid) throw new Error(validation.message)

    return wheel
  }

  const handleCalculate = (event) => {
    event.preventDefault()

    try {
      const wheel = buildWheel()
      const calculation = calculateWheelSpokes(wheel)
      setResult({ ...calculation, wheel })
      setError('')

      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    } catch (calculationError) {
      setResult(null)
      setError(calculationError.message)
    }
  }

  const persistWheels = (wheels) => {
    setSavedWheels(wheels)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wheels))
  }

  const handleSave = () => {
    if (!rimName.trim() || !hubName.trim() || !result) return

    const savedWheel = {
      id: crypto.randomUUID(),
      rimName: rimName.trim(),
      hubName: hubName.trim(),
      leftSpoke: result.leftRounded,
      rightSpoke: result.rightRounded,
      wheel: result.wheel,
    }

    persistWheels([savedWheel, ...savedWheels])
    setRimName('')
    setHubName('')
    setSaveDialogOpen(false)
    setShowSaved(true)
  }

  const handleDelete = (id) => {
    persistWheels(savedWheels.filter((wheel) => wheel.id !== id))
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app-shell">
      <header className="brand-header">
        <img
          className="brand-wordmark"
          src="/assets/letras.png"
          alt="Spoke Calculator"
        />
        <img className="brand-icon" src="/assets/logoo.png" alt="Bicycle hub" />

        <button
          type="button"
          className="secondary-button saved-toggle"
          onClick={() => setShowSaved((current) => !current)}
        >
          Saved Wheels
          {savedWheels.length ? <span className="saved-count">{savedWheels.length}</span> : null}
        </button>
      </header>

      {showSaved ? (
        <section className="saved-panel" aria-label="Saved wheels">
          <div className="saved-panel-heading">
            <h2>Saved Wheels</h2>
            <button type="button" className="text-button" onClick={() => setShowSaved(false)}>
              Close
            </button>
          </div>

          {savedWheels.length === 0 ? (
            <p className="empty-state">No wheels saved yet</p>
          ) : (
            <div className="saved-list">
              {savedWheels.map((wheel) => (
                <article className="saved-wheel" key={wheel.id}>
                  <div>
                    <strong>{wheel.rimName}</strong>
                    <span>{wheel.hubName}</span>
                    {wheel.leftSpoke === wheel.rightSpoke ? (
                      <p>Spoke length: {Number(wheel.leftSpoke).toFixed(1)} mm</p>
                    ) : (
                      <p>
                        Left: {Number(wheel.leftSpoke).toFixed(1)} mm · Right:{' '}
                        {Number(wheel.rightSpoke).toFixed(1)} mm
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="delete-button"
                    aria-label={`Delete ${wheel.rimName} ${wheel.hubName}`}
                    onClick={() => handleDelete(wheel.id)}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <form className="calculator" onSubmit={handleCalculate} noValidate>
        <Section title="Select number of holes">
          <label className="field field-centered">
            <span className="field-label">Holes</span>
            <select
              value={form.holes}
              onChange={(event) => updateField('holes', event.target.value)}
            >
              <option value="">Choose an option...</option>
              {HOLE_OPTIONS.map((holes) => (
                <option value={holes} key={holes}>
                  {holes} holes
                </option>
              ))}
            </select>
          </label>
        </Section>

        <Section
          title="ERD"
          subtitle="Effective Rim Diameter"
          image="/assets/what-is-erd.png"
          imageAlt="Diagram showing Effective Rim Diameter"
        >
          <MeasurementInput
            label="ERD"
            value={form.erd}
            onChange={(value) => updateField('erd', value)}
            placeholder="Enter ERD"
          />
        </Section>

        <Section
          title="Rim Offset"
          subtitle="Enter 0 mm for a symmetric rim"
          image="/assets/imagenOffset.png"
          imageAlt="Diagram comparing a symmetric and asymmetric rim"
        >
          <MeasurementInput
            label="Offset"
            value={form.rimOffset}
            onChange={(value) => updateField('rimOffset', value)}
            placeholder="Enter offset"
          />

          <fieldset className="direction-fieldset">
            <legend>Rim is offset toward</legend>
            <div className="segmented-control">
              <button
                type="button"
                className={
                  form.rimOffsetDirection === RIM_OFFSET_DIRECTIONS.DRIVE ? 'active' : ''
                }
                onClick={() =>
                  updateField('rimOffsetDirection', RIM_OFFSET_DIRECTIONS.DRIVE)
                }
              >
                Drive side
              </button>
              <button
                type="button"
                className={
                  form.rimOffsetDirection === RIM_OFFSET_DIRECTIONS.NON_DRIVE
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  updateField('rimOffsetDirection', RIM_OFFSET_DIRECTIONS.NON_DRIVE)
                }
              >
                Non-drive side
              </button>
            </div>
          </fieldset>
        </Section>

        <Section
          title="PCD"
          subtitle="Pitch Circle Diameter"
          image="/assets/PDC.png"
          imageAlt="Hub diagram showing left and right PCD"
        >
          <div className="two-columns">
            <MeasurementInput
              label="PCD Left · Non-drive side"
              value={form.leftPcd}
              onChange={(value) => updateField('leftPcd', value)}
              placeholder="Left PCD"
            />
            <MeasurementInput
              label="PCD Right · Drive side"
              value={form.rightPcd}
              onChange={(value) => updateField('rightPcd', value)}
              placeholder="Right PCD"
            />
          </div>
        </Section>

        <Section
          title="WL / WR"
          subtitle="Hub center distance"
          image="/assets/PDC.png"
          imageAlt="Hub diagram showing WL and WR distances"
        >
          <div className="two-columns">
            <MeasurementInput
              label="WL · Non-drive side"
              value={form.leftFlangeDistance}
              onChange={(value) => updateField('leftFlangeDistance', value)}
              placeholder="WL"
            />
            <MeasurementInput
              label="WR · Drive side"
              value={form.rightFlangeDistance}
              onChange={(value) => updateField('rightFlangeDistance', value)}
              placeholder="WR"
            />
          </div>
        </Section>

        <Section title="Select number of crosses">
          <label className="field field-centered">
            <span className="field-label">Crosses</span>
            <select
              value={form.crosses}
              onChange={(event) => updateField('crosses', event.target.value)}
            >
              <option value="">Choose an option...</option>
              {CROSS_OPTIONS.map((crosses) => (
                <option value={crosses} key={crosses}>
                  {crosses === 0
                    ? '0 crosses (Radial)'
                    : `${crosses} ${crosses === 1 ? 'cross' : 'crosses'}`}
                </option>
              ))}
            </select>
          </label>
        </Section>

        {error ? (
          <div className="error-message" role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className="primary-button calculate-button">
          Calculate Spokes
        </button>
      </form>

      {result ? (
        <section className="result-panel" ref={resultRef} aria-live="polite">
          <span className="result-eyebrow">Result</span>
          {isSymmetric ? (
            <div className="symmetric-result">
              <span>Spoke length</span>
              <strong>{result.leftRounded.toFixed(1)} mm</strong>
            </div>
          ) : (
            <div className="result-grid">
              <div>
                <span>Left · Non-drive side</span>
                <strong>{result.leftRounded.toFixed(1)} mm</strong>
              </div>
              <div>
                <span>Right · Drive side</span>
                <strong>{result.rightRounded.toFixed(1)} mm</strong>
              </div>
            </div>
          )}

          <div className="result-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setSaveDialogOpen(true)}
            >
              Save Wheel
            </button>
            <button type="button" className="secondary-button" onClick={handleReset}>
              New calculation
            </button>
          </div>
        </section>
      ) : null}

      {saveDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
            <h2 id="save-title">Save wheel</h2>

            <label className="field">
              <span className="field-label">Rim name</span>
              <input
                type="text"
                value={rimName}
                onChange={(event) => setRimName(event.target.value)}
                placeholder="Enter rim name"
                autoFocus
              />
            </label>

            <label className="field">
              <span className="field-label">Hub name</span>
              <input
                type="text"
                value={hubName}
                onChange={(event) => setHubName(event.target.value)}
                placeholder="Enter hub name"
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={handleSave}
              disabled={!rimName.trim() || !hubName.trim()}
            >
              Save wheel
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <footer>
        <span>Spoke Calculator</span>
        <a
          href="https://play.google.com/store/apps/details?id=com.alejandrocifuentes.calculadoraderadios"
          target="_blank"
          rel="noreferrer"
        >
          Android app
        </a>
      </footer>
    </main>
  )
}

export default App
