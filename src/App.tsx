import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DualOceanEngine, FIXED_DT } from './engine/simulation';
import { GAConfig, OceanEventId } from './engine/types';
import { HeaderBar, ViewMode } from './components/HeaderBar';
import { AquariumCanvas } from './components/AquariumCanvas';
import { ChartsPanel } from './components/ChartsPanel';
import { CreatureInspector } from './components/CreatureInspector';
import { ControlsPanel } from './components/ControlsPanel';
import { PresentationSlides } from './components/PresentationSlides';
import { BarChart3, Dna, Presentation, Sliders } from 'lucide-react';

type BottomTab = 'charts' | 'inspector' | 'controls' | 'slides';

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const App: React.FC = () => {
  const engineRef = useRef<DualOceanEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new DualOceanEngine(202607);
  }

  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [activeTab, setActiveTab] = useState<BottomTab>('charts');
  const [renderTick, setRenderTick] = useState(0);

  const [selectedTankId, setSelectedTankId] = useState<'A' | 'B'>('A');
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const elapsed = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (runningRef.current && engineRef.current) {
        accumulator += elapsed * speedRef.current;
        let steps = 0;
        const maxSteps = Math.min(24, Math.ceil(speedRef.current * 4));
        while (accumulator >= FIXED_DT && steps < maxSteps) {
          engineRef.current.step(true);
          accumulator -= FIXED_DT;
          steps++;
        }
        if (steps > 0) {
          setRenderTick((t) => (t + 1) % 1000000);
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const { tankA, tankB, config, event, seed } = engineRef.current.state;

  const handleTurbo = useCallback((gens: number) => {
    engineRef.current?.runTurboGenerations(gens);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleResetSameSeed = useCallback(() => {
    engineRef.current?.reset(engineRef.current.state.seed, true);
    setSelectedCreatureId(null);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleResetNewSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 899999) + 100000;
    engineRef.current?.reset(newSeed, true);
    setSelectedCreatureId(null);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleUpdateConfig = useCallback((partial: Partial<GAConfig>) => {
    engineRef.current?.updateConfig(partial);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleSetEvent = useCallback((ev: OceanEventId) => {
    engineRef.current?.setEvent(ev);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleSelectCreature = useCallback((tankId: 'A' | 'B', id: string) => {
    setSelectedTankId(tankId);
    setSelectedCreatureId(id);
    setActiveTab('inspector');
  }, []);

  const handleDropPlankton = useCallback((tankId: 'A' | 'B', wx: number, wy: number) => {
    engineRef.current?.dropPlanktonBurst(tankId, wx, wy);
    setRenderTick((t) => (t + 1) % 1000000);
  }, []);

  const handleExportCsv = useCallback(() => {
    const st = engineRef.current!.state;
    const headers = [
      'generation',
      'event',
      'A_bestFitness',
      'A_avgFitness',
      'A_survivalPct',
      'A_food',
      'A_diversity',
      'A_body',
      'A_tail',
      'A_fins',
      'A_vision',
      'B_bestFitness',
      'B_avgFitness',
      'B_survivalPct',
      'B_food',
      'B_diversity',
      'B_body',
      'B_tail',
      'B_fins',
      'B_vision',
    ];
    const len = Math.min(st.tankA.history.length, st.tankB.history.length);
    const rows = [headers.join(',')];
    for (let i = 0; i < len; i++) {
      const a = st.tankA.history[i];
      const b = st.tankB.history[i];
      rows.push(
        [
          a.generation,
          a.event,
          a.bestFitness,
          a.avgFitness,
          a.survivalRate,
          a.totalFoodEaten,
          a.diversity,
          (a.avgMorph.bodySize * 100).toFixed(1),
          (a.avgMorph.tailLength * 100).toFixed(1),
          (a.avgMorph.finSpan * 100).toFixed(1),
          (a.avgMorph.visionRange * 100).toFixed(1),
          b.bestFitness,
          b.avgFitness,
          b.survivalRate,
          b.totalFoodEaten,
          b.diversity,
          (b.avgMorph.bodySize * 100).toFixed(1),
          (b.avgMorph.tailLength * 100).toFixed(1),
          (b.avgMorph.finSpan * 100).toFixed(1),
          (b.avgMorph.visionRange * 100).toFixed(1),
        ].join(',')
      );
    }
    downloadFile(`evoabyss-seed-${st.seed}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
  }, []);

  const handleExportJson = useCallback(() => {
    const st = engineRef.current!.state;
    const payload = {
      exportedAt: new Date().toISOString(),
      seed: st.seed,
      configTankA: st.config,
      configTankB: {
        crossover: false,
        mutationRate: 0.1,
        elitismRate: 0,
        reproduction: 'asexual_clone_plus_10pct_mutation',
      },
      tankAHistory: st.tankA.history,
      tankBHistory: st.tankB.history,
    };
    downloadFile(
      `evoabyss-seed-${st.seed}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }, []);

  return (
    <div className="app-shell">
      <HeaderBar
        isRunning={isRunning}
        speed={speed}
        seed={seed}
        generation={tankA.generation}
        event={event}
        viewMode={viewMode}
        onToggleRun={() => setIsRunning((r) => !r)}
        onSetSpeed={setSpeed}
        onTurbo={handleTurbo}
        onResetSameSeed={handleResetSameSeed}
        onResetNewSeed={handleResetNewSeed}
        onSetViewMode={setViewMode}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      <main className="main-content">
        {/* Clean Bioluminescent Aquariums Stage */}
        <section className={`tanks-stage mode-${viewMode}`}>
          {viewMode !== 'focusB' && (
            <AquariumCanvas
              tank={tankA}
              otherTank={tankB}
              event={event}
              selectedCreatureId={selectedTankId === 'A' ? selectedCreatureId : null}
              generationDuration={config.generationDuration}
              renderTick={renderTick}
              onSelectCreature={handleSelectCreature}
              onDropPlankton={handleDropPlankton}
            />
          )}
          {viewMode !== 'focusA' && (
            <AquariumCanvas
              tank={tankB}
              otherTank={tankA}
              event={event}
              selectedCreatureId={selectedTankId === 'B' ? selectedCreatureId : null}
              generationDuration={config.generationDuration}
              renderTick={renderTick}
              onSelectCreature={handleSelectCreature}
              onDropPlankton={handleDropPlankton}
            />
          )}
        </section>

        {/* Sleek Tabbed Lab Panel */}
        <section className="lab-panel">
          <div className="tabs-bar">
            <button
              className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              <BarChart3 size={15} /> Evolução & Gráficos (A vs B)
            </button>
            <button
              className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              <Dna size={15} /> Rede Neural ao Vivo, DNA & Genealogia
            </button>
            <button
              className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveTab('controls')}
            >
              <Sliders size={15} /> Eventos Oceânicos & Parâmetros do AG
            </button>
            <button
              className={`tab-btn tab-btn-slides ${activeTab === 'slides' ? 'active' : ''}`}
              onClick={() => setActiveTab('slides')}
            >
              <Presentation size={15} /> Apresentação & Conclusões (Slides)
            </button>
          </div>

          {activeTab === 'charts' && <ChartsPanel tankA={tankA} tankB={tankB} />}
          {activeTab === 'inspector' && (
            <CreatureInspector
              tankA={tankA}
              tankB={tankB}
              selectedTankId={selectedTankId}
              selectedCreatureId={selectedCreatureId}
              config={config}
              renderTick={renderTick}
              onSelectCreature={handleSelectCreature}
            />
          )}
          {activeTab === 'controls' && (
            <ControlsPanel
              config={config}
              event={event}
              onUpdateConfig={handleUpdateConfig}
              onSetEvent={handleSetEvent}
            />
          )}
          {activeTab === 'slides' && <PresentationSlides tankA={tankA} tankB={tankB} />}
        </section>
      </main>
    </div>
  );
};

export default App;
