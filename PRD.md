# PRD — EvoAbyss: Neuroevolução Profunda de Criaturas Bioluminescentes (Comparativo A/B)

## 1. Visão Geral

**EvoAbyss** é uma simulação visual minimalista de **Neuroevolução Profunda (Algoritmo Genético + Rede Neural de 2 Camadas Ocultas)** em HTML5 Canvas 2D. Criaturas bioluminescentes nascem sem nenhum comportamento programado e **aprendem do zero** a navegar, encadear plânctons escassos, gerenciar fome/energia, evitar paredes e fugir de predadores abissais.

Dois aquários idênticos rodam lado a lado (**mesmo seed**, mesma geração #1, mesmo plâncton e mesmos predadores):

- **Aquário A — AG Neural Profundo (Experimental):** Seleção por Torneio (`k=4`) nos top 60% + **Crossover em 10 Blocos Neurais** + Mutação calibrada (`10%`) + Elitismo (`20%`).
- **Aquário B — Controle (Sem Crossover, Mutação 10%):** Seleção suave por fitness (roleta raiz, para também aprender) **sem crossover**, `0%` elitismo e **10% de mutação fixa por gene**.

---

## 2. Cromossomo de 96 Genes (4 Morfológicos + 92 Sinapses Profundas)

### 2.1. Genes Morfológicos (`4` genes em `[0.10, 1.00]`)
- `bodySize` (**Corpo**), `tailLength` (**Cauda**), `finSpan` (**Nadadeiras**) e `visionRange` (**Visão**).

### 2.2. Rede Neural Profunda `8 → 6 → 4 → 2` (`92` pesos em `[-3.0, +3.0]`)
- **8 Entradas Sensoriais:** Ângulo do plâncton, Distância do plâncton, Ângulo do predador, Distância do predador, Sensor lateral de parede, **Nível de Fome**, **Energia Atual** e **Ângulo do 2º Plâncton**.
- **Camada Oculta 1:** 6 neurônios `tanh` (`6 blocos × 9 genes = 54 pesos`).
- **Camada Oculta 2:** 4 neurônios `tanh` (`4 blocos × 9 genes = 36 pesos`).
- **Camada de Saída:** `Direção` (`[-1, +1]`) e `Impulso` (`[0, 1]`) (`+2` biases = `92` sinapses).

---

## 3. Observabilidade, Gráficos 500+ Gerações & Slides
- **Rede Neural Profunda ao Vivo em SVG (`8 → 6 → 4 → 2`)** no Inspetor de DNA.
- **Gráficos estilo paper de RL/DeepMind:** suavização proporcional simétrica + 30 blocos Bézier + faixa sombreada de dispersão (`±0.55σ`) + mira interativa no hover (legível mesmo na geração 500+).
- **Aba Apresentação & Conclusões:** 7 slides interativos em tela cheia com resultados reais de 5 seeds × 50 gerações e 4 eventos ambientais.
