import React, { useEffect, useState } from 'react';
import { AquariumState } from '../engine/types';
import { BENCHMARK_DATA } from '../data/benchmarkResults';
import {
  buildConfidenceBandPath,
  buildPathFromPoints,
  computeXAxisTicks,
  downsamplePoints,
  movingAverage,
} from '../utils/chartMath';
import {
  InteractiveCrossoverLab,
  InteractiveEventExplorer,
  InteractiveMorphLab,
  InteractiveNeuronLab,
} from './slides/InteractiveWidgets';
import {
  Activity,
  Award,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Crown,
  Dna,
  Eye,
  GitMerge,
  Layers,
  Maximize2,
  Minimize2,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Waves,
  Zap,
} from 'lucide-react';

interface PresentationSlidesProps {
  tankA: AquariumState;
  tankB: AquariumState;
}

interface SlideMeta {
  num: number;
  act: string;
  shortTitle: string;
  interactive?: boolean;
}

const SLIDES: SlideMeta[] = [
  { num: 1, act: 'Intro', shortTitle: '1. Capa & Resumo' },
  { num: 2, act: 'Intro', shortTitle: '2. O que é AG?' },
  { num: 3, act: 'Intro', shortTitle: '3. Por que Neuroevolução?' },
  { num: 4, act: 'Intro', shortTitle: '4. Experimento A vs B' },
  { num: 5, act: 'Organismo', shortTitle: '5. Anatomia (Lab)', interactive: true },
  { num: 6, act: 'Organismo', shortTitle: '6. Os 8 Sensores' },
  { num: 7, act: 'Organismo', shortTitle: '7. Rede 8→6→4→2' },
  { num: 8, act: 'Organismo', shortTitle: '8. Neurônio tanh (Lab)', interactive: true },
  { num: 9, act: 'Organismo', shortTitle: '9. Energia & Fome' },
  { num: 10, act: 'AG', shortTitle: '10. Função de Fitness' },
  { num: 11, act: 'AG', shortTitle: '11. Seleção: Torneio vs Roleta' },
  { num: 12, act: 'AG', shortTitle: '12. Elitismo (20%)' },
  { num: 13, act: 'AG', shortTitle: '13. Crossover (Lab)', interactive: true },
  { num: 14, act: 'AG', shortTitle: '14. Convenções Competidoras' },
  { num: 15, act: 'Resultados', shortTitle: '15. Ecossistema & Predadores' },
  { num: 16, act: 'Resultados', shortTitle: '16. Curvas 5 Seeds (Lab)', interactive: true },
  { num: 17, act: 'Resultados', shortTitle: '17. Comparativo das 5 Seeds' },
  { num: 18, act: 'Resultados', shortTitle: '18. Eventos Extremos (Lab)', interactive: true },
  { num: 19, act: 'Final', shortTitle: '19. Limitações & Futuro' },
  { num: 20, act: 'Final', shortTitle: '20. Conclusões & Banca (Q&A)', interactive: true },
];

const BANK_QA = [
  {
    q: 'Por que usar Algoritmo Genético em vez de Backpropagation?',
    short: 'Não existem dados rotulados nem gradiente por frame na sobrevivência.',
    detail:
      'Em ambientes interativos, o erro só é conhecido ao fim de segundos (sobreviver, comer, escapar). O AG otimiza recompensas atrasadas sem precisar derivar a física e ainda evolui a anatomia do corpo junto com a rede neural.',
  },
  {
    q: 'Por que o Crossover em Blocos funciona melhor que média aritmética?',
    short: 'Média de pesos opostos (+1.8 e -1.8) zera a sinapse e destrói o aprendizado.',
    detail:
      'Esse é o Problema das Convenções Competidoras: dois pais podem resolver o mesmo problema em neurônios ou sinais diferentes. Trocar blocos inteiros de neurônios (A1..A6 e B1..B4) preserva circuitos funcionais coerentes.',
  },
  {
    q: 'O Aquário B também evolui? Por que ele perde para o A?',
    short: 'Sim! Ele sobe de 16 para 34.8 plânctons, mas sem Crossover e Elitismo é muito mais lento.',
    detail:
      'O Aquário B usa seleção suave (roleta raiz) + clonagem com 10% de mutação. Ele consegue aprender, mas em 96 genes não consegue combinar neurônios bons de dois pais distintos nem proteger o campeão contra regressões.',
  },
  {
    q: 'Qual é o papel real do Elitismo (20%)?',
    short: 'Garante convergência monotônica do melhor indivíduo (top 3 copiados intactos).',
    detail:
      'Em redes de 96 genes, mutações ou cruzamentos aleatórios frequentemente pioram uma rede ótima. O Elitismo cria uma "âncora evolutiva" que impede o cardume de desaprender.',
  },
  {
    q: 'Por que não aumentar a rede para 1.000 neurônios?',
    short: 'Maldição da Dimensionalidade: o espaço de busca explode.',
    detail:
      'Com população de 15 criaturas, otimizar milhares de pesos por busca evolutiva exigiria milhares de gerações. A arquitetura 8→6→4→2 (92 sinapses) é o equilíbrio entre expressividade profunda e convergência rápida (~30–50 gerações).',
  },
  {
    q: 'As criaturas foram programadas para fugir dos predadores?',
    short: 'Não! Nenhuma linha de código manda virar para comida ou fugir.',
    detail:
      'O simulador apenas entrega 8 números sensoriais à rede neural e aplica as 2 saídas (direção e impulso) na física. Todo comportamento de caça e fuga emerge espontaneamente da seleção natural.',
  },
];

export const PresentationSlides: React.FC<PresentationSlidesProps> = ({ tankA, tankB }) => {
  const [slide, setSlide] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [dataSource, setDataSource] = useState<'benchmark' | 'live'>('benchmark');
  const [smoothSlideChart, setSmoothSlideChart] = useState(true);
  const [openQaIdx, setOpenQaIdx] = useState<number | null>(0);

  const totalSlides = SLIDES.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') setSlide((s) => Math.min(totalSlides - 1, s + 1));
      if (e.key === 'ArrowLeft') setSlide((s) => Math.max(0, s - 1));
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, totalSlides]);

  const meanFitA =
    BENCHMARK_DATA.seedRuns.reduce((s, r) => s + r.avgFitA, 0) / BENCHMARK_DATA.seedRuns.length;
  const meanFitB =
    BENCHMARK_DATA.seedRuns.reduce((s, r) => s + r.avgFitB, 0) / BENCHMARK_DATA.seedRuns.length;
  const meanGainPct = ((meanFitA - meanFitB) / meanFitB) * 100;
  const meanFoodA =
    BENCHMARK_DATA.seedRuns.reduce((s, r) => s + r.foodA, 0) / BENCHMARK_DATA.seedRuns.length;
  const meanFoodB =
    BENCHMARK_DATA.seedRuns.reduce((s, r) => s + r.foodB, 0) / BENCHMARK_DATA.seedRuns.length;

  // Slide 16 Chart Data (Benchmark vs Live)
  const liveReady = tankA.history.length >= 2 && tankB.history.length >= 2;
  const useLive = dataSource === 'live' && liveReady;
  const gens16 = useLive
    ? tankA.history.map((h) => h.generation)
    : BENCHMARK_DATA.curveA.map((_, i) => i + 1);
  const rawFitA = useLive ? tankA.history.map((h) => h.avgFitness) : BENCHMARK_DATA.curveA;
  const rawFitB = useLive ? tankB.history.map((h) => h.avgFitness) : BENCHMARK_DATA.curveB;
  const rawFoodA = useLive ? tankA.history.map((h) => h.totalFoodEaten) : BENCHMARK_DATA.foodCurveA;
  const rawFoodB = useLive ? tankB.history.map((h) => h.totalFoodEaten) : BENCHMARK_DATA.foodCurveB;

  const win16 = smoothSlideChart ? Math.max(3, Math.round(rawFitA.length * 0.085)) : 1;
  const ptsFitA = downsamplePoints(gens16, movingAverage(rawFitA, win16), 30, rawFitA);
  const ptsFitB = downsamplePoints(gens16, movingAverage(rawFitB, win16), 30, rawFitB);
  const ptsFoodA = downsamplePoints(gens16, movingAverage(rawFoodA, win16), 30, rawFoodA);
  const ptsFoodB = downsamplePoints(gens16, movingAverage(rawFoodB, win16), 30, rawFoodB);
  const ticks16 = computeXAxisTicks(ptsFitA, 380, 38, 12, 5);

  const maxFit16 =
    Math.max(
      120,
      ...ptsFitA.map((p) => p.max ?? p.value),
      ...ptsFitB.map((p) => p.max ?? p.value)
    ) * 1.1;
  const maxFood16 =
    Math.max(
      25,
      ...ptsFoodA.map((p) => p.max ?? p.value),
      ...ptsFoodB.map((p) => p.max ?? p.value)
    ) * 1.1;

  const currentMeta = SLIDES[slide];
  const progressPct = ((slide + 1) / totalSlides) * 100;

  return (
    <div className={`slides-shell ${fullscreen ? 'slides-fullscreen' : ''}`}>
      {/* Top Bar: Jump Selector + Act Progress + Navigation */}
      <div className="slides-nav-bar">
        <div className="slides-jump-group">
          <span className="act-badge">{currentMeta.act}</span>
          <select
            className="slide-select"
            value={slide}
            onChange={(e) => setSlide(parseInt(e.target.value, 10))}
          >
            {SLIDES.map((s, idx) => (
              <option key={s.num} value={idx}>
                {s.shortTitle} {s.interactive ? '★' : ''}
              </option>
            ))}
          </select>
          {currentMeta.interactive && (
            <span className="interactive-tag">
              <Sparkles size={11} /> Interativo
            </span>
          )}
        </div>

        <div className="slides-actions">
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="slide-counter mono">
            {slide + 1} / {totalSlides}
          </span>
          <button
            className="btn btn-xs btn-primary"
            onClick={() => setSlide((s) => Math.min(totalSlides - 1, s + 1))}
            disabled={slide === totalSlides - 1}
          >
            Próximo <ChevronRight size={14} />
          </button>
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Sair da tela cheia (Esc)' : 'Modo Apresentação (Tela Cheia)'}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Sair' : 'Tela Cheia'}
          </button>
        </div>
      </div>

      {/* Slim clickable 20-dot progress strip */}
      <div className="slides-dot-strip">
        {SLIDES.map((s, idx) => (
          <button
            key={s.num}
            className={`slide-dot ${idx === slide ? 'active' : idx < slide ? 'visited' : ''} ${
              s.interactive ? 'is-lab' : ''
            }`}
            onClick={() => setSlide(idx)}
            title={s.shortTitle}
          />
        ))}
      </div>

      {/* Active Slide Content */}
      <div className="slide-stage">
        {/* ==================== SLIDE 1 ==================== */}
        {slide === 0 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Dna size={15} /> SLIDE 1 / 20 • APRESENTAÇÃO DO PROJETO
            </div>
            <h2 className="slide-title">
              EvoAbyss: Neuroevolução Profunda com Algoritmo Genético (Experimento A/B)
            </h2>
            <p className="slide-lead">
              Um simulador abissal em tempo real onde criaturas bioluminescentes nascem sem saber
              nada e <strong>aprendem sozinhas a caçar, economizar energia e fugir de predadores</strong>{' '}
              — evoluindo simultaneamente seu <strong>corpo</strong> e uma{' '}
              <strong>Rede Neural Profunda (8→6→4→2)</strong> de 96 genes.
            </p>

            <div className="slide-kpi-row">
              <div className="slide-kpi">
                <span>Vantagem Média (A vs B)</span>
                <strong className="text-cyan">+{meanGainPct.toFixed(0)}%</strong>
                <em>Média de 5 seeds × 50 gerações</em>
              </div>
              <div className="slide-kpi">
                <span>Plâncton Capturado</span>
                <strong className="text-emerald">
                  {(meanFoodA / Math.max(0.1, meanFoodB)).toFixed(1)}× mais
                </strong>
                <em>
                  {meanFoodA.toFixed(1)} (A) vs {meanFoodB.toFixed(1)} (B)
                </em>
              </div>
              <div className="slide-kpi">
                <span>Tamanho do Genoma</span>
                <strong style={{ color: '#c4b5fd' }}>96 Genes</strong>
                <em>4 morfológicos + 92 sinapses</em>
              </div>
              <div className="slide-kpi">
                <span>Taxa de Vitória (AG)</span>
                <strong className="text-cyan">5 / 5 Seeds</strong>
                <em>100% de superioridade estatística</em>
              </div>
            </div>

            <div className="slide-box">
              <h4>Roteiro da Apresentação (20 Slides — 5 Blocos)</h4>
              <div className="slide-steps-row">
                <div className="step-pill">
                  <span>1–4 • Fundamentos</span>
                  <p>O que é AG, Neuroevolução e o experimento A vs B</p>
                </div>
                <div className="step-pill">
                  <span>5–9 • Organismo & Rede</span>
                  <p>Anatomia interativa, 8 sensores, Rede 8→6→4→2 e neurônio tanh</p>
                </div>
                <div className="step-pill">
                  <span>10–14 • Operadores do AG</span>
                  <p>Fitness, Seleção, Elitismo e Crossover interativo em blocos</p>
                </div>
                <div className="step-pill">
                  <span>15–20 • Dados & Conclusões</span>
                  <p>Resultados de 5 seeds, 4 eventos extremos e Q&A para banca</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 2 ==================== */}
        {slide === 1 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <BookOpen size={15} /> SLIDE 2 / 20 • CONCEITO BASE
            </div>
            <h2 className="slide-title">O que é um Algoritmo Genético (de forma simples)?</h2>
            <p className="slide-lead">
              É uma técnica de Inteligência Artificial inspirada na{' '}
              <strong>Teoria da Evolução de Darwin</strong>: em vez de escrevermos manualmente todas
              as regras de como resolver um problema, deixamos uma população de soluções competir,
              reproduzir e evoluir ao longo de gerações.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-orange">
                <h4>Programação Tradicional (Regras Fixas)</h4>
                <ul>
                  <li>O programador escreve: <code>se vê comida → vire para comida</code>.</li>
                  <li>O programador escreve: <code>se vê predador → fuja 180°</code>.</li>
                  <li>Se o ambiente muda (correnteza, fome), o código não se adapta sozinho.</li>
                  <li>Não há aprendizado nem criatividade emergente.</li>
                </ul>
              </div>
              <div className="slide-box box-cyan">
                <h4>Algoritmo Genético (Evolução Emergente)</h4>
                <ul>
                  <li>
                    <strong>Geração #1:</strong> agentes nascem com DNA aleatório e erram muito.
                  </li>
                  <li>
                    <strong>Avaliação:</strong> quem sobrevive e come mais ganha maior{' '}
                    <strong>Fitness</strong>.
                  </li>
                  <li>
                    <strong>Reprodução (Crossover + Mutação):</strong> filhos herdam combinações dos
                    melhores pais com pequenas variações.
                  </li>
                  <li>
                    <strong>Resultado:</strong> estratégias eficientes surgem sozinhas!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 3 ==================== */}
        {slide === 2 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Brain size={15} /> SLIDE 3 / 20 • NEUROEVOLUÇÃO
            </div>
            <h2 className="slide-title">
              Por que juntar Algoritmo Genético + Rede Neural (Neuroevolução)?
            </h2>
            <p className="slide-lead">
              Redes neurais tradicionais (como ChatGPT ou visão computacional) são treinadas com{' '}
              <strong>Backpropagation</strong> usando milhões de exemplos rotulados. Mas em jogos e
              ecossistemas vivos, ninguém sabe o “ângulo exato perfeito” a cada milissegundo.
            </p>

            <div className="slide-two-col">
              <div className="slide-box">
                <h4>Treinamento Clássico (Backpropagation)</h4>
                <ul>
                  <li>Exige dataset rotulado (<em>entrada → resposta certa</em>).</li>
                  <li>Exige função de erro diferenciável a cada passo.</li>
                  <li>Treina apenas pesos da rede, não a morfologia física do agente.</li>
                </ul>
              </div>
              <div className="slide-box box-cyan">
                <h4>Neuroevolução (Usada no EvoAbyss)</h4>
                <ul>
                  <li>
                    <strong>Zero rótulos:</strong> basta definir o objetivo final (sobreviver, comer
                    plâncton, evitar predadores).
                  </li>
                  <li>
                    <strong>Recompensa atrasada:</strong> avalia o comportamento inteiro ao longo de
                    18 segundos.
                  </li>
                  <li>
                    <strong>Coevolução Corpo + Mente:</strong> o mesmo cromossomo evolui o formato
                    da criatura e os 92 pesos do cérebro!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 4 ==================== */}
        {slide === 3 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Compass size={15} /> SLIDE 4 / 20 • METODOLOGIA CIENTÍFICA
            </div>
            <h2 className="slide-title">Desenho Experimental Controlado (Aquário A vs. B)</h2>
            <p className="slide-lead">
              Para provar empiricamente o ganho do Algoritmo Genético completo, executamos dois
              aquários em paralelo com <strong>condições iniciais 100% idênticas</strong> (mesmo
              gerador determinístico PRNG <code>Mulberry32</code>).
            </p>

            <div className="slide-table-wrap">
              <table className="slide-table">
                <thead>
                  <tr>
                    <th>Variável do Experimento</th>
                    <th className="text-cyan">Aquário A (AG Neural Profundo)</th>
                    <th className="text-orange">Aquário B (Grupo Controle)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Seed, Geração #1 e Coordenadas de Spawn</td>
                    <td>Idênticas (sincronizadas a cada geração)</td>
                    <td>Idênticas (sincronizadas a cada geração)</td>
                  </tr>
                  <tr>
                    <td>População, Plâncton e Predadores</td>
                    <td>15 criaturas • 16 plânctons • 2 predadores</td>
                    <td>15 criaturas • 16 plânctons • 2 predadores</td>
                  </tr>
                  <tr>
                    <td>Genoma / Rede Neural</td>
                    <td>96 genes (4 morfo + Rede 8→6→4→2)</td>
                    <td>96 genes (4 morfo + Rede 8→6→4→2)</td>
                  </tr>
                  <tr>
                    <td><strong>Método de Seleção</strong></td>
                    <td className="text-cyan"><strong>Torneio (k = 4) nos top 60%</strong></td>
                    <td className="text-orange">Roleta suave (fitness^0.55)</td>
                  </tr>
                  <tr>
                    <td><strong>Crossover (Recombinação)</strong></td>
                    <td className="text-cyan"><strong>ATIVO (10 Blocos Neurais)</strong></td>
                    <td className="text-red"><strong>DESATIVADO (Clonagem Assexuada)</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Elitismo</strong></td>
                    <td className="text-cyan"><strong>20% (Top 3 intactos)</strong></td>
                    <td className="text-orange">0% (Sem preservação)</td>
                  </tr>
                  <tr>
                    <td><strong>Mutação</strong></td>
                    <td>10% Gaussiana calibrada</td>
                    <td>10% fixa por gene</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 5 (INTERACTIVE #1) ==================== */}
        {slide === 4 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Sparkles size={15} /> SLIDE 5 / 20 • LABORATÓRIO INTERATIVO #1
            </div>
            <h2 className="slide-title">Anatomia no DNA: Os 4 Genes Morfológicos e Trade-offs</h2>
            <p className="slide-lead">
              Cada criatura tem seu corpo desenhado diretamente pelos 4 primeiros genes do DNA.
              Mova os sliders abaixo ao vivo para ver como a morfologia muda a física e o consumo de
              energia!
            </p>
            <div className="slide-box">
              <InteractiveMorphLab />
            </div>
          </div>
        )}

        {/* ==================== SLIDE 6 ==================== */}
        {slide === 5 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Eye size={15} /> SLIDE 6 / 20 • PERCEPÇÃO AMBIENTAL
            </div>
            <h2 className="slide-title">Os 8 Sensores da Criatura (Entradas da Rede Neural)</h2>
            <p className="slide-lead">
              Todas as entradas são normalizadas entre <code>-1</code> e <code>+1</code> (ou{' '}
              <code>0</code> e <code>1</code>) para que a rede neural processe sinais em escala
              estável.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-cyan">
                <h4>Sensores Externos (Ambiente)</h4>
                <ul>
                  <li><code>x1 — Ângulo Plâncton (-1..1):</code> direção relativa da comida mais próxima.</li>
                  <li><code>x2 — Dist. Plâncton (0..1):</code> proximidade do plâncton dentro do raio de visão.</li>
                  <li><code>x3 — Ângulo Predador (-1..1):</code> direção relativa do predador mais próximo.</li>
                  <li><code>x4 — Dist. Predador (0..1):</code> urgência de perigo (sobe quando chega perto).</li>
                  <li><code>x5 — Sensor Parede (-1..1):</code> indica qual lado está livre próximo às bordas.</li>
                </ul>
              </div>
              <div className="slide-box box-orange">
                <h4>Sensores Avançados (Internos & Planejamento)</h4>
                <ul>
                  <li>
                    <code>x6 — Nível de Fome (0..1):</code> quanto falta para morrer de inanição;
                    permite arriscar mais quando está faminta!
                  </li>
                  <li>
                    <code>x7 — Energia Atual (0..1):</code> reserva metabólica restante; permite
                    dosar o impulso para economizar energia.
                  </li>
                  <li>
                    <code>x8 — 2º Plâncton (-1..1):</code> ângulo do segundo plâncton mais próximo,
                    permitindo <strong>encadear rotas de coleta</strong>!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 7 ==================== */}
        {slide === 6 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Layers size={15} /> SLIDE 7 / 20 • ARQUITETURA PROFUNDA
            </div>
            <h2 className="slide-title">
              Rede Neural Profunda 8 → 6 → 4 → 2 (92 Sinapses no DNA)
            </h2>
            <p className="slide-lead">
              Com <strong>2 camadas ocultas</strong>, a rede forma uma hierarquia de processamento:
              a primeira camada extrai padrões sensoriais e a segunda integra decisões motoras
              complexas.
            </p>

            <div className="slide-two-col wide-left">
              <div className="slide-box">
                <svg viewBox="0 0 540 245" className="slide-svg">
                  {[30, 54, 78, 102, 126, 150, 174, 198].map((y1, i) =>
                    [42, 72, 102, 132, 162, 192].map((y2, h1) => (
                      <line
                        key={`s7a-${i}-${h1}`}
                        x1="138"
                        y1={y1}
                        x2="232"
                        y2={y2}
                        stroke={(i + h1) % 3 === 0 ? '#fb7185' : '#22d3ee'}
                        strokeOpacity="0.28"
                        strokeWidth="0.9"
                      />
                    ))
                  )}
                  {[42, 72, 102, 132, 162, 192].map((y1, h1) =>
                    [58, 96, 134, 172].map((y2, h2) => (
                      <line
                        key={`s7b-${h1}-${h2}`}
                        x1="252"
                        y1={y1}
                        x2="338"
                        y2={y2}
                        stroke={(h1 + h2) % 2 === 0 ? '#38bdf8' : '#a78bfa'}
                        strokeOpacity="0.45"
                        strokeWidth="1.2"
                      />
                    ))
                  )}
                  {[58, 96, 134, 172].map((y1, h2) =>
                    [88, 146].map((y2, o) => (
                      <line
                        key={`s7c-${h2}-${o}`}
                        x1="358"
                        y1={y1}
                        x2="438"
                        y2={y2}
                        stroke="#34d399"
                        strokeOpacity="0.65"
                        strokeWidth="1.7"
                      />
                    ))
                  )}
                  <text x="128" y="13" fontSize="9.2" fill="#94a3b8" textAnchor="middle" fontWeight="700">8 SENSORES</text>
                  <text x="242" y="13" fontSize="9.2" fill="#94a3b8" textAnchor="middle" fontWeight="700">OCULTA 1 (6)</text>
                  <text x="348" y="13" fontSize="9.2" fill="#94a3b8" textAnchor="middle" fontWeight="700">OCULTA 2 (4)</text>
                  <text x="454" y="13" fontSize="9.2" fill="#94a3b8" textAnchor="middle" fontWeight="700">2 SAÍDAS</text>
                  {[
                    'Âng. Plâncton', 'Dist. Plâncton', 'Âng. Predador', 'Dist. Predador',
                    'Sensor Parede', 'Nível de Fome', 'Energia Atual', '2º Plâncton',
                  ].map((lbl, idx) => {
                    const y = 30 + idx * 24;
                    return (
                      <g key={lbl}>
                        <text x="115" y={y + 3} fontSize="8.8" fill="#cbd5e1" textAnchor="end">{lbl}</text>
                        <circle cx="128" cy={y} r="8.5" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.2" />
                        <text x="128" y={y + 3} fontSize="7.5" fill="#fff" textAnchor="middle" fontWeight="700">x{idx + 1}</text>
                      </g>
                    );
                  })}
                  {[42, 72, 102, 132, 162, 192].map((y, h1) => (
                    <g key={h1}>
                      <circle cx="242" cy={y} r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="242" y={y + 3.2} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700">A{h1 + 1}</text>
                    </g>
                  ))}
                  {[58, 96, 134, 172].map((y, h2) => (
                    <g key={h2}>
                      <circle cx="348" cy={y} r="10.5" fill="#2e1065" stroke="#a78bfa" strokeWidth="1.5" />
                      <text x="348" y={y + 3.2} fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700">B{h2 + 1}</text>
                    </g>
                  ))}
                  {[
                    { y: 88, lbl: 'Direção', code: 'y1' },
                    { y: 146, lbl: 'Impulso', code: 'y2' },
                  ].map((o) => (
                    <g key={o.code}>
                      <circle cx="450" cy={o.y} r="12.5" fill="#065f46" stroke="#34d399" strokeWidth="1.7" />
                      <text x="450" y={o.y + 3.5} fontSize="8.8" fill="#fff" textAnchor="middle" fontWeight="700">{o.code}</text>
                      <text x="468" y={o.y + 3.5} fontSize="9.8" fill="#e2e8f0" fontWeight="700">{o.lbl}</text>
                    </g>
                  ))}
                  <rect x="18" y="218" width="504" height="17" rx="5" fill="rgba(15,23,42,0.9)" stroke="rgba(148,163,184,0.25)" />
                  <rect x="20" y="220" width="54" height="13" rx="3" fill="#fbbf24" />
                  <rect x="78" y="220" width="246" height="13" rx="3" fill="#22d3ee" />
                  <rect x="328" y="220" width="166" height="13" rx="3" fill="#a78bfa" />
                  <rect x="498" y="220" width="22" height="13" rx="3" fill="#34d399" />
                  <text x="47" y="229.5" fontSize="7.6" fill="#0f172a" textAnchor="middle" fontWeight="800">4 Morfo</text>
                  <text x="201" y="229.5" fontSize="7.8" fill="#0f172a" textAnchor="middle" fontWeight="800">Camada 1: 6 Blocos A1..A6 (54 pesos)</text>
                  <text x="411" y="229.5" fontSize="7.8" fill="#0f172a" textAnchor="middle" fontWeight="800">Camada 2: 4 Blocos B1..B4 (36)</text>
                  <text x="509" y="229.5" fontSize="7.2" fill="#0f172a" textAnchor="middle" fontWeight="800">2</text>
                </svg>
              </div>
              <div className="slide-box">
                <h4>Contagem Exata dos 96 Genes</h4>
                <div className="formula-card mono">
                  Morfo: 4 genes
                  <br />
                  Camada 1: 6 × (8 pesos + 1 bias) = 54
                  <br />
                  Camada 2: 4 × (6 pesos + 1 bias + 2 saídas) = 36
                  <br />
                  Biases de Saída: 2 &nbsp;→&nbsp; <strong>Total = 96 genes</strong>
                </div>
                <ul>
                  <li>
                    <strong>Inicialização Xavier (`±0.95`):</strong> impede que a função{' '}
                    <code>tanh</code> sature em <code>±1</code> já na Geração #1.
                  </li>
                  <li>
                    <strong>Memória de Blocos:</strong> cada neurônio guarda suas sinapses juntas no
                    vetor de DNA para o Crossover preservar circuitos.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 8 (INTERACTIVE #2) ==================== */}
        {slide === 7 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Sparkles size={15} /> SLIDE 8 / 20 • LABORATÓRIO INTERATIVO #2
            </div>
            <h2 className="slide-title">Por Dentro de um Neurônio: Pesos Sinápticos e Curva tanh</h2>
            <p className="slide-lead">
              Veja na prática como um único neurônio decide virar à esquerda ou direita multiplicando
              sensores por pesos do DNA! Tente inverter o sinal de <code>w₁</code> ou{' '}
              <code>w₂</code> para ver a criatura “desaprender”.
            </p>
            <div className="slide-box">
              <InteractiveNeuronLab />
            </div>
          </div>
        )}

        {/* ==================== SLIDE 9 ==================== */}
        {slide === 8 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Zap size={15} /> SLIDE 9 / 20 • FISIOLOGIA & SOBREVIVÊNCIA
            </div>
            <h2 className="slide-title">Energia Quadrática (thrust²), Fome e Morte</h2>
            <p className="slide-lead">
              Para forçar inteligência real em vez de apenas “acelerar no máximo sem parar”, o gasto
              metabólico cresce quadraticamente com o impulso e cada criatura tem um relógio de
              inanição.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-cyan">
                <h4>Consumo de Energia Dinâmico</h4>
                <div className="formula-card mono">
                  CustoPropulsão ∝ Cauda<sup>1.45</sup> × (0.28 + 1.75 · Impulso²)
                </div>
                <ul>
                  <li>
                    <strong>Nadar devagar (cruzeiro):</strong> economiza energia e aumenta a
                    autonomia para mais de 18s.
                  </li>
                  <li>
                    <strong>Acelerar no máximo (sprint):</strong> queima energia ~2.3× mais rápido —
                    ideal só na hora de dar o bote no plâncton ou fugir do predador!
                  </li>
                  <li>
                    <strong>Sobrecarga Orgânica:</strong> se a soma dos 4 traços físicos passar de{' '}
                    <code>2.35</code>, há penalidade quadrática extra.
                  </li>
                </ul>
              </div>
              <div className="slide-box box-orange">
                <h4>As 3 Causas de Morte no Aquário</h4>
                <ul>
                  <li>
                    <strong>1. Inanição (Temporizador):</strong> se passar de <code>~9–12s</code>{' '}
                    sem comer nenhum plâncton, aparece um arco luminoso amarelo→vermelho e a criatura
                    morre de fome.
                  </li>
                  <li>
                    <strong>2. Exaustão Energética:</strong> se a energia chegar a <code>0%</code>{' '}
                    por excesso de velocidade sem recarregar (<code>+24</code> por plâncton).
                  </li>
                  <li>
                    <strong>3. Predação:</strong> ser alcançada por um dos predadores abissais
                    vermelhos.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 10 ==================== */}
        {slide === 9 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Scale size={15} /> SLIDE 10 / 20 • AVALIAÇÃO EVOLUTIVA
            </div>
            <h2 className="slide-title">Função de Fitness: Como Medimos o Sucesso?</h2>
            <p className="slide-lead">
              A função de fitness é a “bússola” do Algoritmo Genético: ela traduz tudo o que
              aconteceu nos 18 segundos da geração em uma única pontuação numérica por indivíduo.
            </p>

            <div className="slide-box box-cyan">
              <div className="formula-card mono">
                Fitness = (44 · Plâncton) + (2.5 · TempoVivo + 24 · SeViva) + (18 · Fugas) +
                Exploração + Aproximação
              </div>
              <div className="slide-two-col" style={{ marginTop: 6 }}>
                <ul>
                  <li>
                    <strong>Plâncton (+44 pts, ou +58 na Escassez):</strong> maior peso do sistema;
                    força o cérebro a realmente caçar.
                  </li>
                  <li>
                    <strong>Sobrevivência (+2.5/s + 24 bônus):</strong> diferencia quem morre aos 7s
                    de quem completa toda a geração viva.
                  </li>
                </ul>
                <ul>
                  <li>
                    <strong>Fuga de Predador (+18 a +34 pts):</strong> recompensa desviar com
                    sucesso quando um predador se aproxima.
                  </li>
                  <li>
                    <strong>Shaping (Exploração + Aproximação):</strong> dá gradiente suave já na
                    Geração #1 para penalizar quem gira parado em círculos.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 11 ==================== */}
        {slide === 10 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Activity size={15} /> SLIDE 11 / 20 • SELEÇÃO NATURAL
            </div>
            <h2 className="slide-title">Seleção de Progenitores: Torneio (A) vs. Roleta Suave (B)</h2>
            <p className="slide-lead">
              Como decidimos quem passa seus genes adiante? A pressão seletiva controla o equilíbrio
              entre <strong>explorar novas ideias</strong> e <strong>aproveitar os melhores</strong>.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-cyan">
                <h4>Aquário A — Torneio (k = 4) nos Top 60%</h4>
                <ul>
                  <li>Primeiro descartamos os 40% piores (cérebros quebrados não poluem o pool).</li>
                  <li>Sorteia <strong>4 candidatos</strong> e vence quem tem maior Fitness.</li>
                  <li>
                    Mantém chance para o 2º e 3º melhores (evitando clone único), mas garante alta
                    qualidade média dos pais.
                  </li>
                  <li>Também permite testar <strong>Roleta</strong> e <strong>Ranking</strong> ao vivo na aba Parâmetros!</li>
                </ul>
              </div>
              <div className="slide-box box-orange">
                <h4>Aquário B — Roleta Suave (Fitness^0.55)</h4>
                <ul>
                  <li>
                    Probabilidade proporcional à raiz do fitness: quem vai bem tem mais filhos, então
                    o Aquário B <strong>também aprende</strong> (dobra a captura de plâncton!).
                  </li>
                  <li>
                    Porém sem corte elitista e sem crossover, o ruído da roleta faz a evolução
                    avançar muito mais devagar.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 12 ==================== */}
        {slide === 11 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Crown size={15} /> SLIDE 12 / 20 • PRESERVAÇÃO GENÉTICA
            </div>
            <h2 className="slide-title">Elitismo (20%): Por que Proteger os Campeões?</h2>
            <p className="slide-lead">
              Em um cromossomo de <strong>96 genes interdependentes</strong>, a maioria das mutações
              aleatórias piora uma rede neural boa. Sem elitismo, uma geração azarada pode apagar
              todo o progresso de 20 gerações.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-cyan">
                <h4>Com Elitismo 20% (Aquário A)</h4>
                <ul>
                  <li>Os <strong>3 melhores cérebros</strong> (de 15) passam intactos com brilho dourado.</li>
                  <li>Garante que o teto de conhecimento do cardume nunca despenque.</li>
                  <li>Os outros 12 filhos ficam livres para explorar combinações ousadas via Crossover + Mutação!</li>
                </ul>
              </div>
              <div className="slide-box box-orange">
                <h4>Sem Elitismo 0% (Aquário B e Preset Didático)</h4>
                <ul>
                  <li>Mesmo o melhor caçador da geração é obrigatoriamente mutado ou pode nem ser sorteado.</li>
                  <li>Gera “dentes de serra” e regressões frequentes na curva de aprendizado.</li>
                  <li>Na aba <em>Parâmetros</em>, há um preset <strong>“Sem Elitismo”</strong> para demonstrar isso ao vivo!</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 13 (INTERACTIVE #3) ==================== */}
        {slide === 12 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Sparkles size={15} /> SLIDE 13 / 20 • LABORATÓRIO INTERATIVO #3
            </div>
            <h2 className="slide-title">
              Como Acontece o Crossover em 10 Blocos Neurais (Simule ao Vivo!)
            </h2>
            <p className="slide-lead">
              Clique nos métodos abaixo e em <strong>“Gerar Novo Filho”</strong> para mostrar à
              plateia como os 10 blocos neurais (<code>A1..A6</code> da Camada 1 +{' '}
              <code>B1..B4</code> da Camada 2) são combinados!
            </p>
            <div className="slide-box">
              <InteractiveCrossoverLab />
            </div>
          </div>
        )}

        {/* ==================== SLIDE 14 ==================== */}
        {slide === 13 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <GitMerge size={15} /> SLIDE 14 / 20 • DESCOBERTA DE ENGENHARIA
            </div>
            <h2 className="slide-title">
              O Problema das Convenções Competidoras em Redes Neurais
            </h2>
            <p className="slide-lead">
              Um fenômeno famoso na literatura (Stanley & Miikkulainen, NEAT 2002) que nós{' '}
              <strong>comprovamos na prática</strong> durante o desenvolvimento do EvoAbyss!
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-orange">
                <h4>❌ Erro Clássico: Média Aritmética Simples</h4>
                <div className="formula-card mono">
                  Pai A (caça bem): w = +1.8
                  <br />
                  Mãe B (caça bem): w = -1.8 (sinal invertido na camada 2)
                  <br />
                  Filho (média): (+1.8 - 1.8) / 2 = <strong className="text-red">0.0 (Cego!)</strong>
                </div>
                <p className="ev-note">
                  Quando testamos média aritmética simples no EvoAbyss, o Aquário A perdeu em{' '}
                  <strong>5 de 5 seeds</strong> porque os pesos se anulavam!
                </p>
              </div>
              <div className="slide-box box-cyan">
                <h4>✅ Solução Aplicada: Blocos Neurais + Média Segura</h4>
                <ul>
                  <li>
                    <strong>Crossover por Bloco Neuronal:</strong> cada neurônio inteiro (suas
                    entradas + bias + saídas) é herdado junto de um único pai — sem cortar circuitos
                    ao meio.
                  </li>
                  <li>
                    <strong>Aritmético Seguro por Sinal:</strong> só faz média quando ambos os pais
                    têm o mesmo sinal naquela sinapse.
                  </li>
                  <li>
                    <strong>Impacto imediato:</strong> o Aquário A saltou de <code>0/5</code> para{' '}
                    <strong><code>5/5</code> vitórias</strong>!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 15 ==================== */}
        {slide === 14 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <ShieldAlert size={15} /> SLIDE 15 / 20 • DINÂMICA DO AMBIENTE
            </div>
            <h2 className="slide-title">
              O Ecossistema Abissal: Escassez, Predadores e Justiça A/B
            </h2>
            <p className="slide-lead">
              Um bom experimento de IA exige um ambiente desafiador e sem vieses. Calibramos o
              aquário para eliminar sorte espacial e forçar inteligência contínua.
            </p>

            <div className="slide-two-col">
              <div className="slide-box">
                <h4>Pressão de Recursos & Sobrevivência</h4>
                <ul>
                  <li>
                    <strong>Plâncton Escasso (16 unidades):</strong> para 15 criaturas, a competição
                    é real — quem não aprende a mirar rápido morre de fome.
                  </li>
                  <li>
                    <strong>Arena Sincronizada:</strong> a cada geração, Aquário A e B iniciam nas
                    mesmas coordenadas geradas pelo mesmo seed.
                  </li>
                  <li>
                    <strong>Clique Interativo:</strong> durante a demo ao vivo, clicar na água solta
                    plâncton extra para testar os reflexos das criaturas!
                  </li>
                </ul>
              </div>
              <div className="slide-box box-orange">
                <h4>Inteligência dos Predadores Abissais</h4>
                <ul>
                  <li>
                    <strong>Separação Territorial (165px):</strong> predadores se repelem
                    suavemente e evitam perseguir a mesma presa para patrulhar todo o aquário.
                  </li>
                  <li>
                    <strong>Desvio Vetorial nos Cantos:</strong> navegação vetorial + reflexão
                    suave impedem qualquer predador de travar nas bordas.
                  </li>
                  <li>
                    <strong>Visibilidade Clara:</strong> silhueta carmim luminosa com cone de caça
                    para fácil leitura visual à distância.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 16 (INTERACTIVE #4) ==================== */}
        {slide === 15 && (
          <div className="slide-body">
            <div className="slide-header-flex">
              <div>
                <div className="slide-kicker">
                  <TrendingUp size={15} /> SLIDE 16 / 20 • RESULTADOS (INTERATIVO #4)
                </div>
                <h2 className="slide-title">
                  Curvas de Aprendizado: AG Neural Profundo (A) vs. Controle (B)
                </h2>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <div className="segmented small">
                  <button
                    className={`seg-btn ${dataSource === 'benchmark' ? 'active' : ''}`}
                    onClick={() => setDataSource('benchmark')}
                  >
                    Experimento (5 Seeds × 50 Ger)
                  </button>
                  <button
                    className={`seg-btn ${dataSource === 'live' ? 'active' : ''}`}
                    onClick={() => setDataSource('live')}
                    disabled={!liveReady}
                  >
                    Ao Vivo ({tankA.history.length} ger)
                  </button>
                </div>
                <button
                  className={`btn btn-xs ${smoothSlideChart ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSmoothSlideChart((s) => !s)}
                >
                  Suavizar {smoothSlideChart ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="slide-two-col">
              <div className="slide-box">
                <h4>Fitness Médio por Geração (+Faixa ±0.55σ)</h4>
                <svg viewBox="0 0 380 172" className="slide-svg">
                  {[0, 0.5, 1].map((t) => {
                    const y = 14 + (1 - t) * 134;
                    return (
                      <g key={t}>
                        <line x1="38" y1={y} x2="368" y2={y} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" />
                        <text x="34" y={y + 3} fontSize="9" fill="#64748b" textAnchor="end">
                          {Math.round(maxFit16 * t)}
                        </text>
                      </g>
                    );
                  })}
                  {ticks16.map((tk) => (
                    <text key={`s16f-${tk.label}-${tk.x}`} x={tk.x} y={165} fontSize="8.5" fill="#64748b" textAnchor="middle">
                      {tk.label}
                    </text>
                  ))}
                  {smoothSlideChart && rawFitA.length > 30 && (
                    <>
                      <path
                        d={buildConfidenceBandPath(ptsFitB, 380, 172, 38, 12, 14, 24, 0, maxFit16)}
                        fill="rgba(251, 146, 60, 0.14)"
                      />
                      <path
                        d={buildConfidenceBandPath(ptsFitA, 380, 172, 38, 12, 14, 24, 0, maxFit16)}
                        fill="rgba(34, 211, 238, 0.16)"
                      />
                    </>
                  )}
                  <path
                    d={buildPathFromPoints(ptsFitB, 380, 172, 38, 12, 14, 24, 0, maxFit16)}
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="2.4"
                  />
                  <path
                    d={buildPathFromPoints(ptsFitA, 380, 172, 38, 12, 14, 24, 0, maxFit16)}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                  />
                </svg>
                <div className="chart-legend">
                  <span>
                    <i className="leg-line" style={{ background: '#22d3ee' }} /> Aquário A:{' '}
                    <strong>{rawFitA[0]?.toFixed(0)} → {rawFitA[rawFitA.length - 1]?.toFixed(0)}</strong>
                  </span>
                  <span>
                    <i className="leg-line" style={{ background: '#fb923c' }} /> Aquário B:{' '}
                    <strong>{rawFitB[0]?.toFixed(0)} → {rawFitB[rawFitB.length - 1]?.toFixed(0)}</strong>
                  </span>
                </div>
              </div>

              <div className="slide-box">
                <h4>Plâncton Capturado por Geração (Eficiência de Caça)</h4>
                <svg viewBox="0 0 380 172" className="slide-svg">
                  {[0, 0.5, 1].map((t) => {
                    const y = 14 + (1 - t) * 134;
                    return (
                      <g key={t}>
                        <line x1="38" y1={y} x2="368" y2={y} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" />
                        <text x="34" y={y + 3} fontSize="9" fill="#64748b" textAnchor="end">
                          {Math.round(maxFood16 * t)}
                        </text>
                      </g>
                    );
                  })}
                  {ticks16.map((tk) => (
                    <text key={`s16p-${tk.label}-${tk.x}`} x={tk.x} y={165} fontSize="8.5" fill="#64748b" textAnchor="middle">
                      {tk.label}
                    </text>
                  ))}
                  <path
                    d={buildPathFromPoints(ptsFoodB, 380, 172, 38, 12, 14, 24, 0, maxFood16)}
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="2.4"
                  />
                  <path
                    d={buildPathFromPoints(ptsFoodA, 380, 172, 38, 12, 14, 24, 0, maxFood16)}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3"
                  />
                </svg>
                <div className="chart-legend">
                  <span>
                    <i className="leg-line" style={{ background: '#34d399' }} /> Plâncton A:{' '}
                    <strong>{rawFoodA[0]?.toFixed(0)} → {rawFoodA[rawFoodA.length - 1]?.toFixed(0)}</strong>
                  </span>
                  <span>
                    <i className="leg-line" style={{ background: '#fb923c' }} /> Plâncton B:{' '}
                    <strong>{rawFoodB[0]?.toFixed(0)} → {rawFoodB[rawFoodB.length - 1]?.toFixed(0)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 17 ==================== */}
        {slide === 16 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <TrendingUp size={15} /> SLIDE 17 / 20 • VALIDAÇÃO ESTATÍSTICA
            </div>
            <h2 className="slide-title">Reprodutibilidade: Desempenho nas 5 Seeds Independentes</h2>
            <p className="slide-lead">
              Testar apenas uma seed poderia ser sorte. Repetimos o experimento em{' '}
              <strong>5 seeds totalmente distintas</strong> por 50 gerações: o Aquário A venceu em{' '}
              <strong>100% dos casos</strong> (enquanto o B também demonstrou aprendizado gradual).
            </p>

            <div className="slide-table-wrap">
              <table className="slide-table">
                <thead>
                  <tr>
                    <th>Seed</th>
                    <th>Fitness Gen #1</th>
                    <th>Média Últ. 10 Ger (A)</th>
                    <th>Média Últ. 10 Ger (B)</th>
                    <th>Ganho A vs B</th>
                    <th>Plâncton (A / B)</th>
                    <th>Sobrevivência (A / B)</th>
                  </tr>
                </thead>
                <tbody>
                  {BENCHMARK_DATA.seedRuns.map((r) => (
                    <tr key={r.seed}>
                      <td className="mono">{r.seed}</td>
                      <td className="mono">{r.gen1Fit}</td>
                      <td className="mono text-cyan"><strong>{r.avgFitA}</strong></td>
                      <td className="mono text-orange">{r.avgFitB}</td>
                      <td className="mono text-emerald"><strong>+{r.gainPct}%</strong></td>
                      <td className="mono">{r.foodA} / {r.foodB}</td>
                      <td className="mono">{r.survA}% / {r.survB}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="slide-box">
              <h4>Interpretação dos Dados</h4>
              <p className="ev-note">
                Observe que o <strong>Aquário B não é “quebrado”</strong> — ele evolui de ~16 para
                20–59 plânctons/geração graças à seleção suave + 10% de mutação. Porém, a adição de{' '}
                <strong>Torneio + Elitismo + Crossover em Blocos Neurais</strong> no Aquário A eleva
                a média para <strong>{meanFoodA.toFixed(1)} plânctons/geração</strong> (chegando a{' '}
                <strong>+206.8%</strong> na seed padrão <code>202607</code>!).
              </p>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 18 (INTERACTIVE #5) ==================== */}
        {slide === 17 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Waves size={15} /> SLIDE 18 / 20 • PRESSÃO SELETIVA (INTERATIVO #5)
            </div>
            <h2 className="slide-title">
              Adaptação Morfológica Emergente em 4 Cenários Extremos
            </h2>
            <p className="slide-lead">
              Clique nos 4 ambientes abaixo para ver ao vivo a <strong>criatura média que evoluiu</strong>{' '}
              em cada pressão seletiva — sem alterar uma única linha do Algoritmo Genético!
            </p>
            <InteractiveEventExplorer />
          </div>
        )}

        {/* ==================== SLIDE 19 ==================== */}
        {slide === 18 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Compass size={15} /> SLIDE 19 / 20 • ANÁLISE CRÍTICA & EVOLUÇÃO FUTURA
            </div>
            <h2 className="slide-title">Limitações Observadas & Trabalhos Futuros</h2>
            <p className="slide-lead">
              Reconhecer limites técnicos e propor melhorias demonstra maturidade científica na
              defesa do trabalho.
            </p>

            <div className="slide-two-col">
              <div className="slide-box box-orange">
                <h4>Limitações do Experimento Atual</h4>
                <ul>
                  <li>
                    <strong>Topologia Fixa (8→6→4→2):</strong> o AG otimiza os 92 pesos, mas não
                    cria nem remove neurônios dinamicamente.
                  </li>
                  <li>
                    <strong>População Compacta (15):</strong> ótima para clareza visual na tela, mas
                    gera mais variância entre seeds do que populações de 200+ indivíduos.
                  </li>
                  <li>
                    <strong>Predadores com IA Fixa:</strong> os predadores não evoluem junto com as
                    presas.
                  </li>
                </ul>
              </div>
              <div className="slide-box box-cyan">
                <h4>Próximos Passos (Trabalhos Futuros)</h4>
                <ul>
                  <li>
                    <strong>NEAT Completo (Topologia Dinâmica):</strong> começar com redes mínimas e
                    adicionar neurônios/conexões por mutação estrutural.
                  </li>
                  <li>
                    <strong>Coevolução Presa × Predador:</strong> colocar um segundo AG evoluindo o
                    cérebro dos predadores em corrida armamentista!
                  </li>
                  <li>
                    <strong>Comunicação Bioluminescente:</strong> adicionar uma 3ª saída neural
                    (sinal luminoso) para comportamento cooperativo de cardume.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 20 (INTERACTIVE #6) ==================== */}
        {slide === 19 && (
          <div className="slide-body">
            <div className="slide-kicker">
              <Award size={15} /> SLIDE 20 / 20 • CONCLUSÕES & DEFESA (INTERATIVO #6)
            </div>
            <h2 className="slide-title">Conclusões Finais & Cartões de Perguntas da Banca</h2>

            <div className="slide-two-col">
              <div className="slide-box box-cyan">
                <h4>4 Conclusões Principais</h4>
                <ol>
                  <li>
                    <strong>Aprendizado Emergente Real:</strong> sem código de caça/fuga, redes
                    profundas de 92 sinapses multiplicaram por <strong>6.3×</strong> a captura de
                    plâncton em 50 gerações.
                  </li>
                  <li>
                    <strong>Superioridade Comprovada do AG Completo:</strong> venceu em{' '}
                    <strong>5/5 seeds</strong> e <strong>4/4 eventos</strong>, com média de{' '}
                    <strong>+{meanGainPct.toFixed(0)}%</strong> sobre o controle sem crossover.
                  </li>
                  <li>
                    <strong>Engenharia de Representação é Crítica:</strong> Crossover em 10 Blocos
                    Neurais resolveu o cancelamento de pesos opostos.
                  </li>
                  <li>
                    <strong>Adaptação Corpo + Mente:</strong> cada evento moldou autonomamente
                    cauda, corpo, nadadeiras e alcance de visão.
                  </li>
                </ol>
              </div>

              <div className="slide-box">
                <h4>Perguntas Frequentes da Banca (Clique para expandir)</h4>
                <div className="qa-accordion">
                  {BANK_QA.map((item, idx) => {
                    const isOpen = openQaIdx === idx;
                    return (
                      <div key={item.q} className={`qa-card ${isOpen ? 'open' : ''}`}>
                        <button
                          className="qa-trigger"
                          onClick={() => setOpenQaIdx(isOpen ? null : idx)}
                        >
                          <span>{item.q}</span>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {isOpen && (
                          <div className="qa-body">
                            <p className="qa-short">{item.short}</p>
                            <p className="qa-detail">{item.detail}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom thin deck progress bar */}
      <div className="slides-bottom-progress">
        <div style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
};
