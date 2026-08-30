/**
 * Morphic — Mockup demo: real <MorphicButton> + full axis inventory.
 *
 * NOT part of the published package. Local exploration tool only, built
 * on Jay's request (2026-08-29) to see exactly what the drop-in button
 * shows today, and every other engine axis that has no UI yet, so he can
 * decide what belongs in the button and how it should look — iteratively.
 */

import { MorphicProvider } from '@theermite/morphic-adapter';
import { ALL_AXES, MorphicButton } from '@theermite/morphic-adapter/ui';
import {
  clearClickDelay,
  clearColorVisionCorrection,
  clearDwellClick,
  clearIdleDetection,
  clearTremorFilter,
  disableCommandPalette,
  enableCommandPalette,
  enablePomodoroStrip,
  enterRecoveryMode,
  exitRecoveryMode,
  getClickDelayState,
  getColorVisionCorrection,
  getCommandPaletteState,
  getDecisionPointsCap,
  getDwellClickState,
  getIdleDetectionState,
  getPomodoroState,
  getRecoveryState,
  getTremorFilterState,
  setClickDelay,
  setColorVisionCorrection,
  setDecisionPointsCap,
  setDwellClick,
  setIdleDetection,
  setTremorFilter,
  startPomodoro,
  stopPomodoro,
} from '@theermite/morphic-engine';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '../src/ui/morphic-base.css';
import '../src/ui/morphic-button.css';

// ---------------------------------------------------------------------------
// A single "axis not in the button yet" card — generic wrapper, each axis
// supplies its own controls as children.
// ---------------------------------------------------------------------------

function MissingAxisCard(props: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="axis">
      <h3>
        {props.title} <span className="badge absent">absent du bouton</span>
      </h3>
      <p>{props.note}</p>
      {props.children}
    </section>
  );
}

function StateBlock(props: { value: unknown }) {
  return <div className="state">{JSON.stringify(props.value, null, 2)}</div>;
}

// ---------------------------------------------------------------------------
// Decision points cap
// ---------------------------------------------------------------------------

function DecisionCapCard() {
  const [state, setState] = useState(() => ({ cap: getDecisionPointsCap() }));
  return (
    <MissingAxisCard
      title="Plafond de décisions"
      note="Nombre maximum de choix visibles en même temps sur un écran morphique (Dignity §a)."
    >
      <div className="controls">
        <input
          type="number"
          min={1}
          max={20}
          defaultValue={3}
          id="cap-input"
          onChange={(e) => {
            try {
              setDecisionPointsCap(Number(e.target.value));
            } catch {
              /* invalid mid-typing — ignored */
            }
            setState({ cap: getDecisionPointsCap() });
          }}
        />
      </div>
      <StateBlock value={state} />
    </MissingAxisCard>
  );
}

// ---------------------------------------------------------------------------
// Color vision correction (daltonization)
// ---------------------------------------------------------------------------

function DaltonizationCard() {
  const [state, setState] = useState(() => getColorVisionCorrection());
  return (
    <MissingAxisCard
      title="Correction daltonisme"
      note="Corrige la perception des couleurs (protan/deutan/tritan), pas juste une simulation."
    >
      <div className="controls">
        {(['protan', 'deutan', 'tritan'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setColorVisionCorrection(type, 1);
              setState(getColorVisionCorrection());
            }}
          >
            {type}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            clearColorVisionCorrection();
            setState(getColorVisionCorrection());
          }}
        >
          désactiver
        </button>
      </div>
      <StateBlock value={state} />
    </MissingAxisCard>
  );
}

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------

function CommandPaletteCard() {
  const [state, setState] = useState(() => getCommandPaletteState());
  return (
    <MissingAxisCard title="Palette de commandes" note="Navigation clavier (Ctrl/Cmd+K).">
      <div className="controls">
        <button
          type="button"
          onClick={() => {
            enableCommandPalette({ commands: [] });
            setState(getCommandPaletteState());
          }}
        >
          activer
        </button>
        <button
          type="button"
          onClick={() => {
            disableCommandPalette();
            setState(getCommandPaletteState());
          }}
        >
          désactiver
        </button>
      </div>
      <StateBlock value={state} />
    </MissingAxisCard>
  );
}

// ---------------------------------------------------------------------------
// Motor accessibility — click delay, dwell click, tremor filter
// ---------------------------------------------------------------------------

function MotorCards() {
  const [click, setClick] = useState(() => getClickDelayState());
  const [dwell, setDwell] = useState(() => getDwellClickState());
  const [tremor, setTremor] = useState(() => getTremorFilterState());
  return (
    <>
      <MissingAxisCard
        title="Délai de clic"
        note="Ignore les doubles-clics accidentels (tremblement, Parkinson léger)."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              setClickDelay({ delay: 200 });
              setClick(getClickDelayState());
            }}
          >
            activer (200ms)
          </button>
          <button
            type="button"
            onClick={() => {
              clearClickDelay();
              setClick(getClickDelayState());
            }}
          >
            désactiver
          </button>
        </div>
        <StateBlock value={click} />
      </MissingAxisCard>

      <MissingAxisCard
        title="Clic par survol prolongé"
        note="Déclenche un clic après un survol immobile — pour qui ne peut pas cliquer."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              setDwellClick({ delay: 1000 });
              setDwell(getDwellClickState());
            }}
          >
            activer (1000ms)
          </button>
          <button
            type="button"
            onClick={() => {
              clearDwellClick();
              setDwell(getDwellClickState());
            }}
          >
            désactiver
          </button>
        </div>
        <StateBlock value={dwell} />
      </MissingAxisCard>

      <MissingAxisCard
        title="Filtre de tremblement"
        note="Lisse la trajectoire du curseur (moyenne glissante)."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              setTremorFilter({ windowSize: 5 });
              setTremor(getTremorFilterState());
            }}
          >
            activer (fenêtre 5)
          </button>
          <button
            type="button"
            onClick={() => {
              clearTremorFilter();
              setTremor(getTremorFilterState());
            }}
          >
            désactiver
          </button>
        </div>
        <StateBlock value={tremor} />
      </MissingAxisCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Energy — recovery mode, idle detection, pomodoro
// ---------------------------------------------------------------------------

function EnergyCards() {
  const [recovery, setRecovery] = useState(() => getRecoveryState());
  const [idle, setIdle] = useState(() => getIdleDetectionState());
  const [pomo, setPomo] = useState(() => getPomodoroState());
  return (
    <>
      <MissingAxisCard
        title="Mode récupération"
        note="Bascule immédiate vers un profil apaisé (mouvement réduit, densité spacieuse, thème sepia)."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              enterRecoveryMode();
              setRecovery(getRecoveryState());
            }}
          >
            entrer
          </button>
          <button
            type="button"
            onClick={() => {
              exitRecoveryMode();
              setRecovery(getRecoveryState());
            }}
          >
            sortir
          </button>
        </div>
        <StateBlock value={recovery} />
      </MissingAxisCard>

      <MissingAxisCard
        title="Détection d'inactivité"
        note="Suggère une pause après un temps d'inactivité configurable."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              setIdleDetection({ idleMs: 15000 });
              setIdle(getIdleDetectionState());
            }}
          >
            activer (15s)
          </button>
          <button
            type="button"
            onClick={() => {
              clearIdleDetection();
              setIdle(getIdleDetectionState());
            }}
          >
            désactiver
          </button>
        </div>
        <StateBlock value={idle} />
      </MissingAxisCard>

      <MissingAxisCard
        title="Cycles Pomodoro"
        note="Moteur travail/pause cadencé (25/5 par défaut)."
      >
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              startPomodoro();
              setPomo(getPomodoroState());
            }}
          >
            démarrer
          </button>
          <button
            type="button"
            onClick={() => {
              stopPomodoro();
              setPomo(getPomodoroState());
            }}
          >
            arrêter
          </button>
        </div>
        <StateBlock value={pomo} />
      </MissingAxisCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pomodoro strip colour tuner — live experimentation, demo-only.
// Not a shipped feature: enablePomodoroStrip() already accepts these colours
// as options for any real host to set once; this card just makes trying
// different shades fast without a new commit each time.
// ---------------------------------------------------------------------------

function PomodoroStripTuner() {
  const [startColor, setStartColor] = useState('#d1d5db');
  const [midColor, setMidColor] = useState('#3b82f6');
  const [endColor, setEndColor] = useState('#fb923c');

  function applyColors(next: { startColor?: string; midColor?: string; endColor?: string }) {
    enablePomodoroStrip({ startColor, midColor, endColor, ...next });
  }

  return (
    <MissingAxisCard
      title="Couleurs du bandeau pomodoro"
      note="Outil de test seulement — enablePomodoroStrip() accepte déjà ces couleurs en option pour un vrai site. Change une couleur pendant un cycle actif pour voir tout de suite."
    >
      <div className="controls">
        <label className="morphic-mb-duration-field" htmlFor="strip-start">
          Piste
          <input
            id="strip-start"
            type="color"
            value={startColor}
            onChange={(e) => {
              setStartColor(e.target.value);
              applyColors({ startColor: e.target.value });
            }}
          />
        </label>
        <label className="morphic-mb-duration-field" htmlFor="strip-mid">
          Remplissage
          <input
            id="strip-mid"
            type="color"
            value={midColor}
            onChange={(e) => {
              setMidColor(e.target.value);
              applyColors({ midColor: e.target.value });
            }}
          />
        </label>
        <label className="morphic-mb-duration-field" htmlFor="strip-end">
          Fin de phase
          <input
            id="strip-end"
            type="color"
            value={endColor}
            onChange={(e) => {
              setEndColor(e.target.value);
              applyColors({ endColor: e.target.value });
            }}
          />
        </label>
      </div>
    </MissingAxisCard>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function App() {
  // Opt-in host feature — the button never enables this on its own.
  // Bar sits at the very top edge of the viewport, above the header.
  useEffect(() => {
    enablePomodoroStrip();
  }, []);

  return (
    <MorphicProvider>
      <h2>
        Le bouton réel <span className="badge in-button">{ALL_AXES.length} réglages inclus</span>
      </h2>
      <p className="lede">
        Sans restriction (`axes` non fourni) — c'est ce qu'un site voit quand on n'y touche pas.
        Sepia est dans le sélecteur de thème, pas une option séparée. Le bandeau pomodoro (en haut
        de l'écran) n'apparaît que pendant un cycle actif — démarre-en un dans le bouton pour le
        voir.
      </p>
      <div id="button-mount">
        <MorphicButton />
      </div>

      <h2>Ce qui n'est pas dans le bouton</h2>
      <p className="lede">
        Ces réglages existent dans le moteur, prouvés et testés, mais n'ont aucune interface prête à
        l'emploi aujourd'hui.
      </p>
      <div className="grid">
        <DecisionCapCard />
        <DaltonizationCard />
        <CommandPaletteCard />
        <MotorCards />
        <EnergyCards />
        <PomodoroStripTuner />
      </div>
    </MorphicProvider>
  );
}

const root = document.getElementById('app');
if (!root) throw new Error('missing #app');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
