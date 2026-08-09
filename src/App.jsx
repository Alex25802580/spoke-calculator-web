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

function StepCard({ number, title, subtitle, image, imageAlt, children, compact = false }) {
  return (
    <section className={`step-card${compact ? ' step-card--compact' : ''}`}>
      <div className="step-copy">
        <span className="step-number">{String(number).padStart(2, '0')}</span>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className={`step-body${image ? '' : ' step-body--fields-only'}`}>
        {image ? (
          <figure className="diagram-frame">
            <img src={image} alt={imageAlt} />
          </figure>
        ) : null}
        <div className="step-fields">{children}</div>
      </div>
    </section>
  )
}

function MeasurementInput({ label, value, onChange, placeholder, hint }) {
  return (
    <label className="field">
      <span className="field-heading">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="input-shell">
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
    const leftFlangeDistance = validateFlangeDistance(form.leftFlangeDistance, 'Left')
    if (!leftFlangeDistance.valid) throw new Error(leftFlangeDistance.message)
    const rightFlangeDistance = validateFlangeDistance(form.rightFlangeDistance, 'Right')
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
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
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

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setResult(null)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main>
      <div className="top-actions">
        <button className="saved-trigger" type="button" onClick={() => setShowSaved(true)}>
          <span>Saved wheels</span>
          <strong>{savedWheels.length}</strong>
        </button>
      </div>

      <div className="page-shell">
        <section className="calculator-intro">
          <div className="intro-brand">
            <h1 className="sr-only">Spoke length calculator</h1>
            <img className="brand-wordmark" src="/assets/brand-wordmark.png" alt="Spoke Calculator" />
            <img className="brand-icon" src="/assets/brand-hub.png" alt="" />
          </div>
          <p>
            <span>Enter your rim and hub measurements.</span>
            <span>All dimensions are in millimetres.</span>
          </p>
        </section>

        <form className="calculator" onSubmit={handleCalculate} noValidate>
          <StepCard number={1} title="Wheel format" subtitle="Choose the drilling of your rim and hub" compact>
            <label className="field">
              <span className="field-heading"><span>Number of holes</span></span>
              <select value={form.holes} onChange={(event) => updateField('holes', event.target.value)}>
                <option value="">Choose holes...</option>
                {HOLE_OPTIONS.map((holes) => <option value={holes} key={holes}>{holes} holes</option>)}
              </select>
            </label>
          </StepCard>

          <StepCard number={2} title="Effective Rim Diameter" subtitle="Measure where the spoke nipples sit inside the rim" image="/assets/what-is-erd.png" imageAlt="Effective Rim Diameter measurement diagram">
            <MeasurementInput label="ERD" hint="Rim" value={form.erd} onChange={(value) => updateField('erd', value)} placeholder="e.g. 600" />
          </StepCard>

          <StepCard number={3} title="Rim offset" subtitle="Use 0 mm for a symmetric rim" image="/assets/imagenOffset.png" imageAlt="Symmetric and asymmetric rim offset diagram">
            <MeasurementInput label="Offset" hint="Rim" value={form.rimOffset} onChange={(value) => updateField('rimOffset', value)} placeholder="e.g. 2.5" />
            <fieldset className="direction-fieldset">
              <legend>Rim is offset toward</legend>
              <div className="segmented-control">
                <button type="button" className={form.rimOffsetDirection === RIM_OFFSET_DIRECTIONS.DRIVE ? 'active' : ''} onClick={() => updateField('rimOffsetDirection', RIM_OFFSET_DIRECTIONS.DRIVE)}>Drive side</button>
                <button type="button" className={form.rimOffsetDirection === RIM_OFFSET_DIRECTIONS.NON_DRIVE ? 'active' : ''} onClick={() => updateField('rimOffsetDirection', RIM_OFFSET_DIRECTIONS.NON_DRIVE)}>Non-drive</button>
              </div>
            </fieldset>
          </StepCard>

          <StepCard number={4} title="Flange diameter" subtitle="Pitch Circle Diameter for each side of the hub" image="/assets/PDC.png" imageAlt="Hub diagram showing PCD and flange distances">
            <div className="field-pair">
              <MeasurementInput label="PCD Left" hint="Non-drive" value={form.leftPcd} onChange={(value) => updateField('leftPcd', value)} placeholder="Left" />
              <MeasurementInput label="PCD Right" hint="Drive" value={form.rightPcd} onChange={(value) => updateField('rightPcd', value)} placeholder="Right" />
            </div>
          </StepCard>

          <StepCard number={5} title="Flange position" subtitle="Distance from the hub centre to each flange" image="/assets/PDC.png" imageAlt="Hub diagram showing WL and WR distances">
            <div className="field-pair">
              <MeasurementInput label="WL" hint="Non-drive" value={form.leftFlangeDistance} onChange={(value) => updateField('leftFlangeDistance', value)} placeholder="Left" />
              <MeasurementInput label="WR" hint="Drive" value={form.rightFlangeDistance} onChange={(value) => updateField('rightFlangeDistance', value)} placeholder="Right" />
            </div>
          </StepCard>

          <StepCard number={6} title="Lacing pattern" subtitle="Select how many times each spoke crosses another" compact>
            <label className="field">
              <span className="field-heading"><span>Number of crosses</span></span>
              <select value={form.crosses} onChange={(event) => updateField('crosses', event.target.value)}>
                <option value="">Choose lacing...</option>
                {CROSS_OPTIONS.map((crosses) => (
                  <option value={crosses} key={crosses}>{crosses === 0 ? 'Radial · 0 crosses' : `${crosses} ${crosses === 1 ? 'cross' : 'crosses'}`}</option>
                ))}
              </select>
            </label>
          </StepCard>

          {error ? <div className="error-message" role="alert"><strong>Check your measurements</strong><span>{error}</span></div> : null}

          <div className="calculate-bar">
            <div><span>Ready?</span><small>We calculate both sides independently.</small></div>
            <button type="submit" className="primary-button">Calculate spokes <span aria-hidden="true">→</span></button>
          </div>
        </form>

        {result ? (
          <section className="result-panel" ref={resultRef} aria-live="polite">
            <div className="result-heading"><span className="eyebrow">Calculation complete</span><h2>Your spoke lengths</h2></div>
            {isSymmetric ? (
              <div className="single-result"><span>Both sides</span><strong>{result.leftRounded.toFixed(1)} <small>mm</small></strong></div>
            ) : (
              <div className="result-grid">
                <div><span>Left · Non-drive</span><strong>{result.leftRounded.toFixed(1)} <small>mm</small></strong></div>
                <div><span>Right · Drive</span><strong>{result.rightRounded.toFixed(1)} <small>mm</small></strong></div>
              </div>
            )}
            <div className="result-actions">
              <button type="button" className="primary-button" onClick={() => setSaveDialogOpen(true)}>Save this wheel</button>
              <button type="button" className="ghost-button" onClick={handleReset}>New calculation</button>
            </div>
          </section>
        ) : null}

        <footer><span>Spoke Calculator</span><a href="https://play.google.com/store/apps/details?id=com.alejandrocifuentes.calculadoraderadios" target="_blank" rel="noreferrer">Get the Android app ↗</a></footer>
      </div>

      {showSaved ? (
        <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowSaved(false)}>
          <aside className="saved-drawer" aria-label="Saved wheels">
            <div className="drawer-heading"><div><span className="eyebrow">Your workshop</span><h2>Saved wheels</h2></div><button type="button" className="close-button" aria-label="Close saved wheels" onClick={() => setShowSaved(false)}>×</button></div>
            {savedWheels.length === 0 ? <div className="empty-state"><strong>No saved wheels yet</strong><p>Your calculations will appear here.</p></div> : (
              <div className="saved-list">{savedWheels.map((wheel) => (
                <article className="saved-wheel" key={wheel.id}><div><strong>{wheel.rimName}</strong><span>{wheel.hubName}</span><p>{wheel.leftSpoke === wheel.rightSpoke ? `${Number(wheel.leftSpoke).toFixed(1)} mm` : `L ${Number(wheel.leftSpoke).toFixed(1)} mm · R ${Number(wheel.rightSpoke).toFixed(1)} mm`}</p></div><button type="button" className="delete-button" aria-label={`Delete ${wheel.rimName} ${wheel.hubName}`} onClick={() => persistWheels(savedWheels.filter((saved) => saved.id !== wheel.id))}>Delete</button></article>
              ))}</div>
            )}
          </aside>
        </div>
      ) : null}

      {saveDialogOpen ? (
        <div className="modal-backdrop"><div className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title"><span className="eyebrow">Keep this build</span><h2 id="save-title">Save wheel</h2><label className="field"><span className="field-heading"><span>Rim name</span></span><input type="text" value={rimName} onChange={(event) => setRimName(event.target.value)} placeholder="e.g. DT Swiss RR 511" autoFocus /></label><label className="field"><span className="field-heading"><span>Hub name</span></span><input type="text" value={hubName} onChange={(event) => setHubName(event.target.value)} placeholder="e.g. Shimano 105" /></label><div className="dialog-actions"><button type="button" className="primary-button" onClick={handleSave} disabled={!rimName.trim() || !hubName.trim()}>Save wheel</button><button type="button" className="ghost-button" onClick={() => setSaveDialogOpen(false)}>Cancel</button></div></div></div>
      ) : null}
    </main>
  )
}

export default App
