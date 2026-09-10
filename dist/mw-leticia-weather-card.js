/* mw-ha-leticia-weather-card — dois tipos de card num arquivo só:
 *
 *   custom:mw-leticia-weather-card   o card de tempo, em cinco layouts
 *   custom:mw-leticia-sky-card       o céu no cabeçalho, no menu e no fundo
 *
 * Precedente da casa para dois tipos num arquivo: mw-ha-top-buttons-pack.
 * Assim continua valendo o padrão "arquivo único, sem build, sem zip_release",
 * e o céu nasce DESLIGADO — só existe onde alguém colocar o card de controle.
 *
 * O QUE ESTE CARD FAZ E NENHUM OUTRO FAZ
 * ──────────────────────────────────────
 * Desenha a DISCÓRDIA. A linha das próximas horas vem com a nuvem p10–p90 do
 * conjunto de modelos por trás. Em 09/09/2026, no mesmo minuto, cinco
 * aplicativos discordaram em 4 °C sobre o mesmo quintal — um número sozinho
 * mente por omissão, e aqui a largura da dúvida é parte do desenho.
 *
 * Funciona com QUALQUER entidade `weather.`; com a integração
 * mw-ha-leticia-weather ele ganha a banda de confiança, os alertas e a fala.
 *
 * Repo: https://github.com/visaodeempresa/mw-ha-leticia-weather-card
 */
(() => {
  "use strict";
  const VERSION = "0.3.1";

  // >>> mw-climate-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-climate-scale/mw-climate-scale.js
  // Escala canônica de cor por temperatura (°C) e umidade relativa (%).
  // Regra: IA/rules/global/40-cores-de-temperatura-e-umidade.md.
  const MW_CLIMATE_SCALE_ALPHA = 0.5;

  // 19 limites superiores inclusivos → 20 cores (a última vale de 46 °C para cima).
  const MW_TEMP_STOPS = [
    3.99, 6.99, 8.99, 13.99, 15.99, 17.99, 18.99, 20.99, 21.99, 22.99,
    23.99, 24.99, 25.99, 26.99, 29.99, 32.99, 35.99, 39.99, 45.99,
  ];
  const MW_TEMP_RGB = (
    "0,0,0 0,0,139 0,0,255 70,130,180 0,206,209 64,224,208 0,255,255 144,238,144 0,255,0 50,205,50 " +
    "127,255,0 154,205,50 255,255,0 255,215,0 255,165,0 255,99,71 255,69,0 178,34,34 139,0,0 139,0,0"
  ).split(" ");

  // Uma faixa por ponto percentual: índice n cobre [n, n+1); 100 é faixa própria.
  // O template original fecha a faixa em n.99 e deixa (n.99, n+1) sem dono — o
  // laço cai no fallback, que é a cor de 100% (preto). Sensor que reporte
  // 58,995 % pisca preto. Aqui o vão é fechado de propósito.
  const MW_HUM_RGB = (
    "0,0,0 51,0,0 102,0,0 153,0,0 204,0,0 255,0,0 255,11,0 255,22,0 255,33,0 255,45,0 " +
    "255,56,0 255,67,0 255,78,0 255,89,0 255,100,0 255,111,0 255,122,0 255,133,0 255,144,0 255,155,0 " +
    "255,165,0 255,170,0 255,174,0 255,179,0 255,183,0 255,188,0 255,192,0 255,197,0 255,201,0 255,206,0 " +
    "255,210,0 255,215,0 255,219,0 255,224,0 255,228,0 255,233,0 255,237,0 255,242,0 255,246,0 255,251,0 " +
    "255,255,0 170,255,85 85,255,170 0,255,255 12,252,253 24,249,251 36,246,249 48,243,247 60,240,245 72,237,243 " +
    "84,234,241 96,231,239 108,228,237 120,225,235 132,222,234 144,219,231 156,216,229 173,216,230 115,144,238 58,72,246 " +
    "0,0,255 0,0,249 0,0,243 0,0,237 0,0,231 0,0,225 0,0,219 0,0,213 0,0,207 0,0,201 " +
    "0,0,195 0,0,189 0,0,183 0,0,177 0,0,171 0,0,165 0,0,159 0,0,153 0,0,147 0,0,141 " +
    "0,0,139 0,0,132 0,0,125 0,0,118 0,0,111 0,0,104 0,0,97 0,0,90 0,0,83 0,0,76 " +
    "0,0,69 0,0,62 0,0,55 0,0,48 0,0,41 0,0,34 0,0,27 0,0,20 0,0,13 0,0,6 " +
    "0,0,0"
  ).split(" ");
  const MW_HUM_STOPS = MW_HUM_RGB.slice(1).map((_, i) => i + 0.99);

  const mwClimateRgba = (triplet, alpha) => `rgba(${triplet.split(",").join(", ")}, ${alpha})`;

  // Faixas + cores no formato do algoritmo de faixa comum: a cor é a primeira
  // cujo limite superior não foi ultrapassado. `clamp` existe porque umidade
  // fora de 0..100 é ruído de sensor, não frio.
  const mwClimateScale = (kind, alpha) => {
    const a = Number.isFinite(Number(alpha)) ? Number(alpha) : MW_CLIMATE_SCALE_ALPHA;
    const hum = kind === "hum" || kind === "humidity" || kind === "umidade";
    return {
      stops: hum ? MW_HUM_STOPS : MW_TEMP_STOPS,
      colors: (hum ? MW_HUM_RGB : MW_TEMP_RGB).map((t) => mwClimateRgba(t, a)),
      clamp: hum ? [0, 100] : null,
    };
  };

  // Cor seca (sem degradê), do jeito que o button-card faz.
  const mwClimateColor = (kind, value, alpha) => {
    const s = mwClimateScale(kind, alpha);
    let v = Number(value);
    if (!Number.isFinite(v)) return null;
    if (s.clamp) v = Math.min(s.clamp[1], Math.max(s.clamp[0], v));
    const i = s.stops.findIndex((stop) => v <= stop);
    return s.colors[i === -1 ? s.stops.length : i];
  };
  // <<< mw-climate-scale v1

  // >>> mw-pressure-scale v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/mw-pressure-scale/mw-pressure-scale.js
  // Escala canônica de pressão atmosférica (hPa ao nível do mar) + tendência.
  // Doc: IA/knowledge/ha-pressao-msl-vs-estacao.md.
  const MW_PRESSURE_ALPHA = 0.5;

  // Limites SUPERIORES inclusivos, em hPa MSL. Seis faixas.
  // Os cortes são os do mostrador de barômetro aneroide clássico, que é o que
  // o morador já sabe ler: abaixo de 1000 chove, perto de 1013 (a atmosfera
  // padrão) é variável, acima de 1020 firma.
  const MW_PRESSURE_STOPS = [980, 1000, 1010, 1020, 1030];
  const MW_PRESSURE_RGB = [
    "106, 27, 154",   // <=980   — tempestade / ciclone
    "40, 90, 180",    // <=1000  — chuva
    "70, 140, 175",   // <=1010  — instável
    "120, 144, 156",  // <=1020  — variável (1013,25 = atmosfera padrão)
    "205, 173, 76",   // <=1030  — firme
    "230, 145, 40",   // >1030   — muito firme, ar seco
  ];
  const MW_PRESSURE_LABELS = [
    "tempestade",
    "chuva",
    "instável",
    "variável",
    "firme",
    "muito firme",
  ];

  // Janela de PLAUSIBILIDADE para pressão MSL: os extremos já observados no
  // planeta (870 hPa no olho do tufão Tip, 1084 hPa em Agata, Sibéria). Fora
  // dela é sensor com defeito ou unidade errada, e o consumidor TEM de tratar
  // `null` como "fora de escala" e avisar — nunca grudar o ponteiro no
  // batente, que é mentir com desenho.
  const MW_PRESSURE_PLAUSIVEL = [870, 1085];

  // ATENÇÃO: a janela acima NÃO pega o erro mais comum desta casa. Pressão de
  // ESTAÇÃO a 1200 m (887,2 hPa, medido em 2026-09-09) cabe dentro dela e
  // pintaria "tempestade" para sempre. Só a altitude denuncia. Fórmula
  // barométrica padrão (ISA), a mesma da conversão inversa.
  const mwPressureEsperadaNaAltitude = (alt) => {
    const h = Number(alt);
    if (!Number.isFinite(h)) return null;
    return 1013.25 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
  };

  // Verdadeiro quando o número cheira a pressão de estação em vez de MSL: a
  // casa está alta o bastante para a diferença importar E o valor está na
  // vizinhança do que a altitude prevê. ±25 hPa cobre a variação real do
  // tempo (a medição de 2026-09-09 deu 887,2 contra 877,2 previstos pela ISA).
  const mwPressureParecePressaoDeEstacao = (hpa, alt, tolerancia) => {
    const v = Number(hpa);
    const h = Number(alt);
    if (!Number.isFinite(v) || !Number.isFinite(h) || h < 200) return false;
    const esperada = mwPressureEsperadaNaAltitude(h);
    return Math.abs(v - esperada) <= (Number.isFinite(Number(tolerancia)) ? Number(tolerancia) : 25);
  };

  // Conversão pela unidade DA ENTIDADE, nunca chutada. hPa e mbar são a mesma
  // coisa; kPa aparece em sensor chinês; inHg em fonte americana; mmHg no
  // mostrador interno do barômetro da foto.
  const MW_PRESSURE_PARA_HPA = {
    hpa: 1, hPa: 1, mbar: 1, mb: 1, millibar: 1,
    kpa: 10, kPa: 10,
    pa: 0.01, Pa: 0.01,
    psi: 68.9476,
    inhg: 33.8639, inHg: 33.8639, "in": 33.8639, '"hg': 33.8639,
    mmhg: 1.33322, mmHg: 1.33322, torr: 1.33322,
  };

  const mwPressureRgba = (triplet, alpha) =>
    `rgba(${triplet}, ${alpha === undefined || alpha === null ? MW_PRESSURE_ALPHA : alpha})`;

  // Vazio/nulo NÃO é zero (a mesma guarda de mw-level-scale, pelo mesmo motivo:
  // Number("") é 0, e 0 hPa pintaria roxo de furacão).
  const mwPressureNum = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const v = Number(value);
    return Number.isFinite(v) ? v : null;
  };

  // Normaliza qualquer unidade para hPa. `unit` vem de
  // attributes.unit_of_measurement — se vier vazia, assume hPa e o consumidor
  // deve dizer que assumiu.
  const mwPressureToHpa = (value, unit) => {
    const v = mwPressureNum(value);
    if (v === null) return null;
    const u = String(unit || "hPa").trim();
    const f = MW_PRESSURE_PARA_HPA[u] ?? MW_PRESSURE_PARA_HPA[u.toLowerCase()];
    return f === undefined ? null : v * f;
  };

  // Barometria: reduz a pressão da estação ao nível do mar. `alt` em metros,
  // `tempC` a temperatura do ar (se faltar, 15 °C da atmosfera padrão — o erro
  // por 10 °C de engano é ~0,4 % da altitude, aceitável e declarado).
  const mwPressureToMsl = (hpaEstacao, alt, tempC) => {
    const p = mwPressureNum(hpaEstacao);
    const h = mwPressureNum(alt);
    if (p === null || h === null) return null;
    const t = mwPressureNum(tempC);
    const tk = (t === null ? 15 : t) + 273.15;
    return p * Math.pow(1 - (0.0065 * h) / (tk + 0.0065 * h), -5.257);
  };

  // Mesma forma de mwClimateScale/mwLevelScale: um caminho de pintura só.
  const mwPressureScale = (alpha) => ({
    stops: MW_PRESSURE_STOPS.slice(),
    colors: MW_PRESSURE_RGB.map((c) => mwPressureRgba(c, alpha)),
    clamp: null,
  });

  // Devolve null fora da janela plausível — de propósito (ver acima).
  const mwPressureIndex = (hpa) => {
    const v = mwPressureNum(hpa);
    if (v === null) return null;
    if (v < MW_PRESSURE_PLAUSIVEL[0] || v > MW_PRESSURE_PLAUSIVEL[1]) return null;
    const i = MW_PRESSURE_STOPS.findIndex((stop) => v <= stop);
    return i === -1 ? MW_PRESSURE_STOPS.length : i;
  };

  const mwPressureColor = (hpa, alpha) => {
    const i = mwPressureIndex(hpa);
    return i === null ? null : mwPressureRgba(MW_PRESSURE_RGB[i], alpha);
  };

  const mwPressureLabel = (hpa) => {
    const i = mwPressureIndex(hpa);
    return i === null ? null : MW_PRESSURE_LABELS[i];
  };

  // --- TENDÊNCIA ---------------------------------------------------------
  // Variação em 3 h, em hPa. O corte de 1,6 hPa/3 h é o do próprio Zambretti
  // (é o que separa "subindo" de "estável"); os degraus mais finos existem
  // para o texto na tela, não para a previsão.
  const MW_PRESSURE_TREND_STOPS = [0.5, 1.6, 3.5];
  const MW_PRESSURE_TREND = {
    estavel:   { label: "estável",           seta: "→", zambretti: "steady" },
    lenta:     { label: "mudando devagar",   seta: null, zambretti: "steady" },
    moderada:  { label: "mudando",           seta: null, zambretti: null },
    rapida:    { label: "mudando rápido",    seta: null, zambretti: null },
  };

  // Devolve {classe, label, seta, delta, zambretti} — `zambretti` é
  // "rising" | "steady" | "falling", já com o corte de 1,6 hPa aplicado.
  const mwPressureTrend = (delta3h) => {
    const d = mwPressureNum(delta3h);
    if (d === null) return null;
    const a = Math.abs(d);
    const subindo = d > 0;
    const classe = a <= MW_PRESSURE_TREND_STOPS[0] ? "estavel"
      : a <= MW_PRESSURE_TREND_STOPS[1] ? "lenta"
      : a <= MW_PRESSURE_TREND_STOPS[2] ? "moderada" : "rapida";
    const base = MW_PRESSURE_TREND[classe];
    const seta = classe === "estavel" ? "→"
      : classe === "rapida" ? (subindo ? "⇈" : "⇊") : (subindo ? "↑" : "↓");
    const label = classe === "estavel" ? "estável"
      : `${base.label} ${subindo ? "para cima" : "para baixo"}`;
    return {
      classe,
      label,
      seta,
      delta: d,
      zambretti: a < 1.6 ? "steady" : (subindo ? "rising" : "falling"),
    };
  };
  // <<< mw-pressure-scale v1

  // ── astronomia de bolso ───────────────────────────────────────────────────
  // Sol e lua na posição REAL: é o que separa um céu que reage de um céu que
  // ilustra. Precisão de ~1°, que para desenhar um disco de 12 px é folga.
  const RAD = Math.PI / 180;

  const diaJuliano = (d) => d.getTime() / 86400000 + 2440587.5;

  const posicaoSolar = (data, lat, lon) => {
    const n = diaJuliano(data) - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const epsilon = (23.439 - 0.0000004 * n) * RAD;
    const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
    const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
    const hora = (gmst * 15 + lon) * RAD - ra;
    const latR = lat * RAD;
    const elev = Math.asin(
      Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hora)
    );
    const azim = Math.atan2(
      Math.sin(hora),
      Math.cos(hora) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR)
    );
    return { elevacao: elev / RAD, azimute: ((azim / RAD + 180) % 360 + 360) % 360 };
  };

  // Fase da lua de 0 (nova) a 1 (nova de novo); 0,5 é cheia.
  const faseLunar = (data) => {
    const sinodico = 29.530588853;
    const nova = 2451550.1; // 2000-01-06, lua nova de referência
    return (((diaJuliano(data) - nova) / sinodico) % 1 + 1) % 1;
  };

  // ── paleta do céu ─────────────────────────────────────────────────────────
  // A cor sai de (condição × altura do sol) — nunca da hora do relógio, que
  // mente perto dos trópicos e mente muito longe deles.
  const CEUS = {
    noite:      ["#070b18", "#111a33", "#1b2547"],
    alvorada:   ["#1b2547", "#7a4a6b", "#e8a06a"],
    manha:      ["#4a9fd8", "#87c5e8", "#c8e4f5"],
    dia:        ["#2f86d6", "#67b3e8", "#a9d8f3"],
    tarde:      ["#2a6fb5", "#7f9fd0", "#e6c39a"],
    poente:     ["#2b2a52", "#a4536a", "#f0a05e"],
    nublado:    ["#5a6472", "#7c8794", "#a3adb8"],
    nubladoNoite: ["#0d1220", "#1c2433", "#2c3648"],
    chuva:      ["#2f3a48", "#48576a", "#63758c"],
    tempestade: ["#16181f", "#2b2f3d", "#3f4557"],
    neve:       ["#7d8794", "#a7b1bd", "#d3dae1"],
    nevoeiro:   ["#6f757c", "#93999f", "#bfc4c9"],
  };

  const paletaDoCeu = (ceu, elevacao, noiteForcada) => {
    const noite = noiteForcada === true || (noiteForcada !== false && elevacao < -6);
    if (ceu === "tempestade") return CEUS.tempestade;
    if (ceu === "chuva") return CEUS.chuva;
    if (ceu === "neve") return CEUS.neve;
    if (ceu === "nevoeiro") return CEUS.nevoeiro;
    if (ceu === "nuvem") return noite ? CEUS.nubladoNoite : CEUS.nublado;
    if (noite) return CEUS.noite;
    if (elevacao < 3) return elevacao < 0 ? CEUS.alvorada : CEUS.poente;
    if (elevacao < 15) return CEUS.tarde;
    if (elevacao < 35) return CEUS.manha;
    return CEUS.dia;
  };

  // Códigos WMO → desenho do céu. A mesma tabela da integração; aqui em forma
  // curta porque o card só precisa do desenho, não do texto.
  const CEU_POR_CONDICAO = {
    "clear-night": "limpo", sunny: "limpo", partlycloudy: "nuvem",
    cloudy: "nuvem", fog: "nevoeiro", hail: "tempestade",
    lightning: "tempestade", "lightning-rainy": "tempestade",
    pouring: "chuva", rainy: "chuva", snowy: "neve", "snowy-rainy": "chuva",
    windy: "nuvem", "windy-variant": "nuvem", exceptional: "nuvem",
  };

  const ICONE = {
    "clear-night": "mdi:weather-night", sunny: "mdi:weather-sunny",
    partlycloudy: "mdi:weather-partly-cloudy", cloudy: "mdi:weather-cloudy",
    fog: "mdi:weather-fog", hail: "mdi:weather-hail",
    lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
    pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy",
    snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy",
    windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
    exceptional: "mdi:alert-circle-outline",
  };

  const TEXTO = {
    "clear-night": "céu limpo", sunny: "sol", partlycloudy: "parcialmente nublado",
    cloudy: "nublado", fog: "nevoeiro", hail: "granizo", lightning: "trovoadas",
    "lightning-rainy": "tempestade", pouring: "chuva forte", rainy: "chuva",
    snowy: "neve", "snowy-rainy": "chuva com neve", windy: "ventando",
    "windy-variant": "ventando", exceptional: "tempo excepcional",
  };

  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  const DEFAULTS = {
    layout: "hoje",
    ceu_animado: true,
    mostrar_banda: true,
    mostrar_alertas: true,
    mostrar_ar: true,
    horas: 24,
    dias: 7,
  };

  const LABELS = {
    entity: "Entidade de tempo",
    name: "Título",
    layout: "Layout",
    ceu_animado: "Céu animado",
    mostrar_banda: "Banda de confiança do conjunto",
    mostrar_alertas: "Faixa de alertas",
    mostrar_ar: "Qualidade do ar e UV",
    horas: "Horas na fita",
    dias: "Dias na semana",
    superficies: "Onde pintar o céu",
    ativo: "Céu ligado",
    escopo: "Em quais telas",
    dashboards: "Telas escolhidas",
    intensidade: "Intensidade",
    movimento: "Movimento",
  };

  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (v, c = 0) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(c).replace(".", ",");
  const esc = (s) =>
    String(s === null || s === undefined ? "" : s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );

  // ── desenho do céu (SVG, sem laço de animação) ────────────────────────────
  // Estrelas, sol, lua e chuva são elementos com `animation` de CSS: o
  // compositor cuida deles na GPU e a aba oculta pausa sozinha, sem timer para
  // gerenciar. Zero JavaScript por quadro — é o que segura o orçamento.
  const desenharCeu = (ceu, elevacao, azimute, fase, animado, semente, noiteForcada) => {
    const partes = [];
    const noite =
      noiteForcada === true || (noiteForcada !== false && elevacao < -6);
    const alt = Math.max(-12, Math.min(60, elevacao));
    const y = 62 - ((alt + 12) / 72) * 48; // 62 (horizonte) → 14 (zênite)
    const x = 8 + (azimute / 360) * 84;

    if (noite && ceu !== "tempestade" && ceu !== "chuva") {
      // Campo de estrelas determinístico: a mesma casa vê o mesmo céu, e o
      // desenho não pisca a cada repintura.
      let s = semente;
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      for (let i = 0; i < 26; i++) {
        const ex = 2 + rnd() * 96;
        const ey = 2 + rnd() * 60;
        const r = 0.35 + rnd() * 0.75;
        const atraso = (rnd() * 4).toFixed(1);
        partes.push(
          `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${r.toFixed(2)}" ` +
            `fill="#fff" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}" ` +
            `${animado ? `class="cintila" style="animation-delay:${atraso}s"` : ""}/>`
        );
      }
    }

    if (ceu === "nuvem" || ceu === "chuva" || ceu === "tempestade" || ceu === "neve") {
      const nuvens = ceu === "nuvem" ? 2 : 3;
      for (let i = 0; i < nuvens; i++) {
        const cx = 12 + i * 34;
        const cy = 22 + (i % 2) * 12;
        const e = 1 + (i % 2) * 0.25;
        partes.push(
          `<g class="${animado ? "nuvem" : ""}" style="animation-delay:${-i * 9}s" ` +
            `opacity="${ceu === "nuvem" ? 0.5 : 0.72}">` +
            `<ellipse cx="${cx}" cy="${cy}" rx="${16 * e}" ry="${7 * e}" fill="#fff"/>` +
            `<ellipse cx="${cx + 10 * e}" cy="${cy - 4}" rx="${11 * e}" ry="${6 * e}" fill="#fff"/>` +
            `</g>`
        );
      }
    }

    if (ceu === "chuva" || ceu === "tempestade") {
      for (let i = 0; i < 14; i++) {
        const rx = 4 + i * 7;
        partes.push(
          `<line x1="${rx}" y1="34" x2="${rx - 3}" y2="46" stroke="#cfe3f5" ` +
            `stroke-width="1.1" stroke-linecap="round" opacity="0.65" ` +
            `${animado ? `class="chuva" style="animation-delay:${(i % 7) * 0.13}s"` : ""}/>`
        );
      }
    }
    if (ceu === "tempestade") {
      partes.push(
        `<path d="M 52 26 l -7 14 h 6 l -5 13 12 -16 h -6 z" fill="#ffe08a" ` +
          `${animado ? 'class="raio"' : 'opacity="0.9"'}/>`
      );
    }
    return { svg: partes.join(""), astro: { x, y, noite, fase, ceu } };
  };

  // Sol e lua saem em HTML, não em SVG: o SVG do céu é esticado
  // (`preserveAspectRatio="none"`) e deixaria os dois OVAIS. Um `<div>`
  // redondo com `border-radius` é imune ao estica-e-puxa e ainda anima na GPU.
  const astroHtml = ({ x, y, noite, fase, ceu }) => {
    // A coluna da DIREITA é do ícone de condição e do chip de confiança —
    // um disco de sol ali vira um segundo sol ao lado do primeiro. O astro
    // fica na metade esquerda e na faixa de 8 a 34 px do topo.
    const esq = `left:${Math.min(Math.max(x, 8), 56).toFixed(1)}%`;
    const topo = `top:${Math.min(Math.max((y / 80) * 118, 8), 34).toFixed(0)}px`;
    if (noite) {
      const iluminado = Math.abs(fase - 0.5) * 2; // 0 cheia, 1 nova
      const desloc = (fase < 0.5 ? 1 : -1) * iluminado * 100;
      return (
        `<div class="lua" style="${esq};${topo}">` +
        (iluminado > 0.06
          ? `<i style="transform:translateX(${desloc.toFixed(0)}%)"></i>`
          : "") +
        `</div>`
      );
    }
    if (ceu === "limpo" || ceu === "nuvem") {
      return `<div class="sol" style="${esq};${topo}"></div>`;
    }
    return "";
  };

  const CSS_CEU = `
    /* O astro mora numa faixa estreita do TOPO. Solto, ele descia até 91 px e
       atropelava a linha de temperatura e a leitura de umidade — o véu do céu
       não sabe onde o texto está, então quem tem de saber é o astro. */
    .sol, .lua { position: absolute; width: 34px; height: 34px; margin: -17px 0 0 -17px;
                 border-radius: 50%; pointer-events: none; }
    .sol { background: #ffd76a; box-shadow: 0 0 26px 12px rgba(255,215,106,.28); }
    .lua { background: #f3efdf; overflow: hidden; }
    .lua i { position: absolute; inset: 0; border-radius: 50%;
             background: var(--mw-ceu-fundo, #0b1020); }
    .cintila { animation: mwCintila 4s ease-in-out infinite alternate; }
    @keyframes mwCintila { from { opacity: .25 } to { opacity: .95 } }
    .nuvem { animation: mwNuvem 46s linear infinite; }
    @keyframes mwNuvem { from { transform: translateX(-24px) } to { transform: translateX(112px) } }
    .chuva { animation: mwChuva 1.05s linear infinite; }
    @keyframes mwChuva { from { transform: translateY(-10px); opacity: 0 }
                          20% { opacity: .7 } to { transform: translateY(18px); opacity: 0 } }
    .raio { animation: mwRaio 5.5s steps(1) infinite; }
    @keyframes mwRaio { 0%,92% { opacity: 0 } 93%,95% { opacity: 1 } 96%,100% { opacity: 0 } }
    @media (prefers-reduced-motion: reduce) {
      .cintila, .nuvem, .chuva, .raio { animation: none !important; }
      .chuva { opacity: .6 }
      .raio { opacity: .9 }
    }
  `;

  const ESTILO = `
    :host { display: block; }
    ha-card { overflow: hidden; position: relative; }
    .ceu { position: absolute; inset: 0; z-index: 0; }
    .astros { position: absolute; top: 0; left: 0; right: 0; height: 118px; }
    /* Em card baixo não há faixa de topo livre: o disco cai em cima do texto
       («20°» sobre a lua deu 3,07:1). Nesses layouts o céu fica só no degradê. */
    ha-card[data-layout="faixa"] .astros,
    ha-card[data-layout="semana"] .astros { display: none; }
    .astros svg { width: 100%; height: 100%; display: block; }
    /* Véu: o texto é branco e o céu vai de quase preto a azul claro.
       A primeira versão era mais FORTE no topo e quase transparente no meio —
       ou seja, protegia onde o céu já era escuro e abandonava o texto
       exatamente no céu claro do meio-dia: 71 dos 73 textos abaixo de 4,5:1
       com sol aberto. Estes valores foram MEDIDOS pelo inspetor de design em
       (armadilha da casa: CRASE dentro de comentário no template literal do
       CSS fecha a string e o card some sem erro visível)
       2026-09-09: com eles, fog, cloudy, partlycloudy, rainy, lightning-rainy
       e clear-night ficam com zero reprovado. */
    .ceu::after { content: ""; position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(8,12,22,.46),
                                  rgba(8,12,22,.60) 45%, rgba(8,12,22,.66)); }
    .conteudo { position: relative; z-index: 1; padding: 14px 16px;
                display: flex; flex-direction: column; gap: 12px;
                color: var(--mw-ceu-tinta, #fff);
                text-shadow: 0 1px 3px rgba(0,0,0,.45); }
    .topo { display: flex; align-items: flex-start; justify-content: space-between;
            gap: 12px; }
    .agora { display: flex; align-items: baseline; gap: 6px; }
    .agora .n { font-size: 46px; font-weight: 300; line-height: .95;
                font-variant-numeric: tabular-nums; letter-spacing: -2px; }
    .agora .u { font-size: 18px; font-weight: 500; opacity: .85; }
    .local { font-size: 13px; font-weight: 600; opacity: .95; }
    .cond { font-size: 13px; opacity: .9; }
    .medidas { display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 12px;
               opacity: .95; }
    .medidas span { display: inline-flex; align-items: center; gap: 4px; }
    .confianca { display: inline-flex; align-items: center; gap: 5px;
                 font-size: 11px; padding: 2px 7px; border-radius: 99px;
                 background: rgba(255,255,255,.16); backdrop-filter: blur(3px); }
    .fita { width: 100%; height: 92px; display: block; }
    .semana { display: grid; gap: 4px; }
    .linha { display: grid; grid-template-columns: 52px 24px 1fr 32px 34px;
             align-items: center; gap: 8px; font-size: 12px; }
    .barra { height: 7px; border-radius: 99px; position: relative;
             background: rgba(255,255,255,.18); overflow: hidden; }
    .barra i { position: absolute; top: 0; bottom: 0; border-radius: 99px; }
    .alerta { display: flex; gap: 8px; align-items: flex-start; font-size: 12px;
              line-height: 1.35; padding: 7px 10px; border-radius: 10px;
              background: rgba(0,0,0,.28); border-left: 3px solid var(--cor, #ffa600);
              text-shadow: none; color: #fff; }
    .alerta b { font-weight: 700; }
    .ar { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; opacity: .95; }
    .vazio { padding: 20px; text-align: center; font-size: 13px;
             color: var(--secondary-text-color); }
    .faixa { display: flex; align-items: center; gap: 14px; }
    .faixa .n { font-size: 30px; }
    button.abrir { all: unset; cursor: pointer; display: block; }
    button.abrir:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    ${CSS_CEU}
  `;

  // ── leitura do estado ─────────────────────────────────────────────────────
  const lerTempo = (hass, id) => {
    const st = hass && hass.states[id];
    if (!st) return null;
    const a = st.attributes || {};
    return {
      estado: st.state,
      nome: a.friendly_name || id,
      temperatura: num(a.temperature),
      sensacao: num(a.apparent_temperature),
      umidade: num(a.humidity),
      // Pressão pela escala canônica (regra 190): a unidade vem da entidade,
      // e a altitude da casa é o que denuncia pressão de ESTAÇÃO. Uma
      // entidade `weather.` normalmente entrega MSL, mas um card não pode
      // APOSTAR nisso: a 1200 m a de estação marca ~887 hPa e o número
      // apareceria como se fosse olho de furacão.
      pressao: mwPressureToHpa(a.pressure, a.pressure_unit || "hPa"),
      vento: num(a.wind_speed),
      rajada: num(a.wind_gust_speed),
      direcao: num(a.wind_bearing),
      nuvens: num(a.cloud_coverage),
      uv: num(a.uv_index),
      unidade: a.temperature_unit || "°C",
      // Estes só existem com a integração MW Letícia Weather. Sem eles o card
      // funciona igual, só sem a banda — degradar em silêncio é requisito.
      spread: num(a.confianca_spread),
      p10: num(a.temperatura_p10),
      p90: num(a.temperatura_p90),
      porModelo: a.por_modelo || null,
      falaAgora: a.fala_agora || null,
      alertas: num(a.alertas),
      // A faixa de plausibilidade sozinha NÃO pega o engano: 887 hPa é um
      // valor MSL legítimo. Só a altitude denuncia.
      pressaoDeEstacao: mwPressureParecePressaoDeEstacao(
        mwPressureToHpa(a.pressure, a.pressure_unit || "hPa"),
        num(hass.config && hass.config.elevation) ?? 0
      ),
    };
  };

  const lerAlertas = (hass) => {
    const saida = [];
    for (const id of Object.keys(hass.states)) {
      const st = hass.states[id];
      const a = st.attributes || {};
      if (Array.isArray(a.lista) && a.fala_alertas !== undefined) {
        for (const x of a.lista) saida.push(x);
      }
    }
    return saida;
  };

  const lerAr = (hass) => {
    const saida = {};
    for (const id of Object.keys(hass.states)) {
      const st = hass.states[id];
      const dc = (st.attributes || {}).device_class;
      if (dc === "pm25" && saida.pm25 === undefined) {
        saida.pm25 = num(st.state);
        saida.faixa = (st.attributes || {}).faixa;
      }
      if (dc === "aqi" && saida.aqi === undefined) saida.aqi = num(st.state);
    }
    return saida;
  };

  // ── o card ────────────────────────────────────────────────────────────────
  class WeatherCard extends HTMLElement {
    setConfig(config) {
      if (!config || !config.entity) {
        throw new Error("Informe `entity`: uma entidade `weather.`.");
      }
      if (!String(config.entity).startsWith("weather.")) {
        throw new Error("`entity` precisa ser do domínio `weather.`.");
      }
      const layouts = ["faixa", "hoje", "semana", "completo", "alerta"];
      if (config.layout && !layouts.includes(config.layout)) {
        throw new Error(`layout desconhecido: ${config.layout}. Use ${layouts.join(", ")}.`);
      }
      this._config = { ...DEFAULTS, ...config };
      this._chave = null;
      if (this._hass) this._atualizar();
    }

    set hass(hass) {
      this._hass = hass;
      this._atualizar();
    }

    connectedCallback() {
      // A previsão vem por serviço, não por atributo (o atributo `forecast`
      // saiu do HA). Uma assinatura por card, cancelada ao sair da tela.
      this._assinar();
    }

    disconnectedCallback() {
      if (this._cancelar) {
        this._cancelar.then((f) => f && f()).catch(() => {});
        this._cancelar = null;
      }
    }

    getCardSize() {
      return { faixa: 2, alerta: 2, hoje: 6, semana: 5, completo: 9 }[this._config.layout] || 6;
    }

    static getConfigElement() {
      return document.createElement("mw-leticia-weather-card-editor");
    }

    static getStubConfig(hass) {
      const id = Object.keys(hass && hass.states ? hass.states : {}).find((k) =>
        k.startsWith("weather.")
      );
      return { type: "custom:mw-leticia-weather-card", entity: id || "", layout: "hoje" };
    }

    _assinar() {
      if (!this._hass || !this._config || this._cancelar) return;
      const tipo = this._config.layout === "semana" ? "daily" : "hourly";
      this._cancelar = this._hass.connection
        .subscribeMessage(
          (ev) => {
            this._previsao = (ev && ev.forecast) || [];
            this._chave = null;
            this._atualizar();
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: tipo,
            entity_id: this._config.entity,
          }
        )
        .catch(() => null);
    }

    _atualizar() {
      if (!this._config || !this._hass) return;
      if (!this._cancelar) this._assinar();
      const d = lerTempo(this._hass, this._config.entity);
      // A chave decide se vale repintar. Ela precisa conter TUDO que o card
      // desenha: sem os alertas e o ar aqui, o card ficava mudo justamente
      // quando tinha algo a dizer — um aviso de tempestade chegava e a tela
      // não mudava. Medido pelo inspetor de design em 2026-09-09.
      const avisos = this._config.mostrar_alertas ? lerAlertas(this._hass) : [];
      const ar = this._config.mostrar_ar ? lerAr(this._hass) : {};
      const chave = JSON.stringify([
        d && d.estado,
        d && d.temperatura,
        d && d.umidade,
        d && d.spread,
        (this._previsao || []).length,
        (this._previsao || [])[0] && this._previsao[0].datetime,
        this._config.layout,
        new Date().getHours(),
        // Título e descrição entram: um aviso REEMITIDO com o mesmo tipo e a
        // mesma severidade, mas com texto novo («20 a 30 mm/h» → «60 a 100
        // mm/h, risco de deslizamento»), não redesenhava.
        avisos
          .map((a) => `${a.tipo}:${a.severidade}:${a.titulo}:${a.descricao}`)
          .join("|"),
        ar.aqi,
        ar.pm25,
      ]);
      if (chave === this._chave) return;
      this._chave = chave;
      this._render(d);
    }

    _render(d) {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const c = this._config;
      if (!d) {
        this.shadowRoot.innerHTML =
          `<style>${ESTILO}</style><ha-card><div class="vazio">` +
          `Entidade não encontrada: ${esc(c.entity)}</div></ha-card>`;
        return;
      }

      const agora = new Date();
      const lat = num(this._hass.config && this._hass.config.latitude) ?? 0;
      const lon = num(this._hass.config && this._hass.config.longitude) ?? 0;
      const sol = posicaoSolar(agora, lat, lon);
      const ceu = CEU_POR_CONDICAO[d.estado] || "nuvem";
      const noite = d.estado === "clear-night" ? true : d.estado === "sunny" ? false : null;
      const paleta = paletaDoCeu(ceu, sol.elevacao, noite);
      const fase = faseLunar(agora);
      const semente = Math.floor(Math.abs(lat * 1000) + Math.abs(lon * 1000)) || 7;
      const animar = c.ceu_animado !== false;

      // O degradê é do CARD inteiro (CSS, custo zero) e os astros vivem numa
      // FAIXA DE ALTURA FIXA no topo. Com o SVG esticado sobre a altura toda, a
      // lua acabava em cima da linha de temperatura nos layouts altos — e a
      // altura do card muda com o layout, então porcentagem não resolve.
      const desenho = desenharCeu(
        ceu, sol.elevacao, sol.azimute, fase, animar, semente, noite
      );
      const fundoCeu =
        `<div class="ceu" aria-hidden="true" style="background:linear-gradient(` +
        `180deg,${paleta[0]},${paleta[1]} 55%,${paleta[2]})">` +
        `<div class="astros">` +
        `<svg viewBox="0 0 100 80" preserveAspectRatio="none">${desenho.svg}</svg>` +
        astroHtml(desenho.astro) +
        `</div></div>`;

      const alertas = c.mostrar_alertas ? lerAlertas(this._hass) : [];
      const corpo =
        c.layout === "faixa"
          ? this._faixa(d)
          : c.layout === "alerta"
            ? ""
            : c.layout === "semana"
              ? this._semana()
              : c.layout === "completo"
                ? this._topo(d) + this._fita(d) + this._semana() + this._ar()
                : this._topo(d) + this._fita(d);

      this.shadowRoot.innerHTML = `
        <style>${ESTILO}</style>
        <ha-card data-layout="${esc(c.layout)}" style="--mw-ceu-fundo:${paleta[0]}">
          ${fundoCeu}
          <div class="conteudo">
            ${corpo}
            ${alertas
              .slice(0, 3)
              .map(
                (a) =>
                  `<div class="alerta" style="--cor:${esc(a.cor || "#ffa600")}">` +
                  `<span aria-hidden="true">⚠️</span><span>` +
                  `<b>${esc(a.severidade_rotulo || "Aviso")}</b> · ${esc(a.titulo)}. ` +
                  `${esc(a.descricao || "")}` +
                  (a.oficial ? ` <i>${esc(a.fonte)}</i>` : " <i>cálculo derivado da previsão</i>") +
                  `</span></div>`
              )
              .join("")}
          </div>
        </ha-card>`;

      const abrir = this.shadowRoot.querySelector("button.abrir");
      if (abrir) {
        abrir.addEventListener("click", () => {
          const ev = new Event("hass-more-info", { bubbles: true, composed: true });
          ev.detail = { entityId: c.entity };
          this.dispatchEvent(ev);
        });
      }
    }

    _topo(d) {
      const c = this._config;
      const conf =
        d.spread !== null
          ? `<span class="confianca" title="largura p10–p90 do conjunto de modelos">` +
            `<span aria-hidden="true">◈</span> ±${fmt(d.spread / 2, 1)} ${d.unidade}` +
            `${d.spread >= 2.5 ? " · modelos discordam" : ""}</span>`
          : "";
      return `
        <div class="topo">
          <div>
            <div class="local">${esc(c.name || d.nome)}</div>
            <button class="abrir" type="button"
                    aria-label="${esc(d.nome)}: ${fmt(d.temperatura)} graus, ${esc(TEXTO[d.estado] || d.estado)}">
              <div class="agora"><span class="n">${fmt(d.temperatura)}</span>
                   <span class="u">${esc(d.unidade)}</span></div>
            </button>
            <div class="cond">${esc(TEXTO[d.estado] || d.estado)}${
              d.sensacao !== null && Math.abs(d.sensacao - d.temperatura) >= 2
                ? ` · sensação ${fmt(d.sensacao)}${esc(d.unidade)}`
                : ""
            }</div>
          </div>
          <div style="text-align:right">
            <ha-icon icon="${ICONE[d.estado] || "mdi:weather-cloudy"}"
                     style="--mdc-icon-size:44px"></ha-icon>
            <div>${conf}</div>
          </div>
        </div>
        <div class="medidas">
          ${d.umidade !== null ? `<span><ha-icon icon="mdi:water-percent" style="--mdc-icon-size:16px"></ha-icon>${fmt(d.umidade)}%</span>` : ""}
          ${d.vento !== null ? `<span><ha-icon icon="mdi:weather-windy" style="--mdc-icon-size:16px"></ha-icon>${fmt(d.vento)} km/h</span>` : ""}
          ${
            d.pressao !== null
              ? // A FAIXA vai ESCRITA, não pintada. Cor sobre o céu é portador
                // frágil: o ícone chegava a 1,04:1 com céu de neve, e a faixa
                // só existia no `title=`, que não aparece em toque.
                `<span><ha-icon icon="mdi:gauge" style="--mdc-icon-size:16px;` +
                `color:currentColor"></ha-icon>${fmt(d.pressao, 1)} hPa${
                  mwPressureLabel(d.pressao)
                    ? ` · ${esc(mwPressureLabel(d.pressao))}`
                    : " · fora de escala"
                }${d.pressaoDeEstacao ? " (estação)" : ""}</span>`
              : ""
          }
          ${d.uv !== null ? `<span><ha-icon icon="mdi:weather-sunny-alert" style="--mdc-icon-size:16px"></ha-icon>UV ${fmt(d.uv, 1)}</span>` : ""}
        </div>`;
    }

    _faixa(d) {
      return `
        <div class="faixa">
          <ha-icon icon="${ICONE[d.estado] || "mdi:weather-cloudy"}"
                   style="--mdc-icon-size:40px"></ha-icon>
          <div class="agora"><span class="n">${fmt(d.temperatura)}</span>
               <span class="u">${esc(d.unidade)}</span></div>
          <div>
            <div class="local">${esc(this._config.name || d.nome)}</div>
            <div class="cond">${esc(TEXTO[d.estado] || d.estado)}${
              d.umidade !== null ? ` · ${fmt(d.umidade)}% de umidade` : ""
            }</div>
          </div>
        </div>`;
    }

    // A FITA COM A BANDA DE CONFIANÇA — o motivo deste card existir.
    _fita(d) {
      const p = (this._previsao || []).slice(0, Math.max(6, this._config.horas));
      if (p.length < 3) return "";
      const temps = p.map((h) => num(h.temperature)).filter((t) => t !== null);
      if (temps.length < 3) return "";
      const min = Math.min(...temps);
      const max = Math.max(...temps);
      const faixa = Math.max(max - min, 1);
      // Largura do viewBox perto da largura real do card: com `none` e um
      // viewBox de 100 o texto sai espremido horizontalmente.
      const L = 300;
      const H = 92;
      const x = (i) => (i / (p.length - 1)) * L;
      const y = (t) => 66 - ((t - min) / faixa) * 40;

      const linha = p
        .map((h, i) => `${i ? "L" : "M"} ${x(i).toFixed(2)} ${y(num(h.temperature)).toFixed(2)}`)
        .join(" ");

      // A banda só existe quando a integração publica o spread. Sem ela, o card
      // desenha a linha e pronto — não inventa incerteza que não mediu.
      let banda = "";
      if (this._config.mostrar_banda && d.spread !== null && d.spread > 0.15) {
        const meia = d.spread / 2;
        const cima = p
          .map((h, i) => `${i ? "L" : "M"} ${x(i).toFixed(2)} ${y(num(h.temperature) + meia).toFixed(2)}`)
          .join(" ");
        const baixo = p
          .slice()
          .reverse()
          .map((h, j) => {
            const i = p.length - 1 - j;
            return `L ${x(i).toFixed(2)} ${y(num(h.temperature) - meia).toFixed(2)}`;
          })
          .join(" ");
        banda = `<path d="${cima} ${baixo} Z" fill="#fff" opacity="0.20"/>`;
      }

      const marcas = p
        .map((h, i) => {
          if (i % Math.ceil(p.length / 6) !== 0) return "";
          const hora = new Date(h.datetime).getHours();
          return (
            // O primeiro rótulo começa em x=0 e o `<svg>` recorta metade dele:
            // «19h» virava «9h». A âncora muda nas pontas.
            `<text x="${x(i).toFixed(2)}" y="87" fill="currentColor" font-size="8" ` +
            `text-anchor="${
              i === 0 ? "start" : i >= p.length - 2 ? "end" : "middle"
            }" opacity="0.85">${String(hora).padStart(2, "0")}h</text>` +
            `<text x="${x(i).toFixed(2)}" y="${(y(num(h.temperature)) - 5).toFixed(2)}" ` +
            `fill="currentColor" font-size="9" text-anchor="middle" font-weight="600">` +
            `${fmt(h.temperature)}°</text>`
          );
        })
        .join("");

      const chuva = p
        .map((h, i) => {
          const pr = num(h.precipitation_probability);
          if (pr === null || pr < 15) return "";
          const alt = (pr / 100) * 14;
          return (
            `<rect x="${(x(i) - 2.5).toFixed(2)}" y="${(78 - alt).toFixed(2)}" width="5" ` +
            `height="${alt.toFixed(2)}" fill="#8fd0ff" opacity="0.75" rx="0.8"/>`
          );
        })
        .join("");

      return `<svg class="fita" viewBox="0 0 ${L} ${H}" preserveAspectRatio="none"
                   role="img" aria-label="Temperatura das próximas ${p.length} horas${
                     banda ? ", com a faixa de incerteza dos modelos" : ""
                   }">
        ${chuva}${banda}
        <path d="${linha}" fill="none" stroke="#fff" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round"/>
        ${marcas}
      </svg>`;
    }

    _semana() {
      const p = (this._previsao || []).filter((f) => f.templow !== undefined);
      const dias = p.slice(0, this._config.dias);
      if (!dias.length) return "";
      const min = Math.min(...dias.map((d) => num(d.templow)));
      const max = Math.max(...dias.map((d) => num(d.temperature)));
      const faixa = Math.max(max - min, 1);
      const cor = (t) => mwClimateColor("temp", t, 0.85) || "rgba(255,255,255,.7)";
      return `<div class="semana">${dias
        .map((d) => {
          const lo = num(d.templow);
          const hi = num(d.temperature);
          const e = ((lo - min) / faixa) * 100;
          const w = Math.max(((hi - lo) / faixa) * 100, 6);
          const data = new Date(d.datetime);
          return `<div class="linha">
              <span>${DIAS[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}</span>
              <ha-icon icon="${ICONE[d.condition] || "mdi:weather-cloudy"}"
                       style="--mdc-icon-size:18px"></ha-icon>
              <span class="barra"><i style="left:${e.toFixed(1)}%;width:${w.toFixed(1)}%;
                    background:linear-gradient(90deg,${cor(lo)},${cor(hi)})"></i></span>
              <span style="opacity:.75;text-align:right">${fmt(lo)}°</span>
              <span style="font-weight:600;text-align:right">${fmt(hi)}°</span>
            </div>`;
        })
        .join("")}</div>`;
    }

    _ar() {
      if (!this._config.mostrar_ar) return "";
      const ar = lerAr(this._hass);
      if (ar.pm25 === undefined && ar.aqi === undefined) return "";
      return `<div class="ar">
        ${ar.aqi !== undefined ? `<span>Qualidade do ar <b>${fmt(ar.aqi)}</b></span>` : ""}
        ${ar.pm25 !== undefined ? `<span>PM2.5 <b>${fmt(ar.pm25, 1)}</b> µg/m³${
          ar.faixa ? ` · ${esc(ar.faixa)}` : ""
        }</span>` : ""}
      </div>`;
    }
  }

  // ── o CÉU: um pintor só, que não depende de card nenhum ───────────────────
  //
  // A primeira versão prendia a pintura ao ciclo de vida do card: o céu vivia
  // enquanto a view estivesse aberta e morria ao sair. Duas consequências que
  // o dono viu na prática em 2026-09-10:
  //
  //   1. a tonalidade SUMIA ao navegar — o `hui-root` é reconstruído a cada
  //      troca de painel e leva junto o `<style>` injetado nele;
  //   2. só existia onde o card estivesse, então a Home padrão nunca pintava.
  //
  // Agora o pintor é um SINGLETON do módulo, guiado por configuração guardada
  // no `frontend/set_user_data`. Como este arquivo é recurso do Lovelace, ele
  // carrega em TODO dashboard — inclusive na Home padrão. O card virou o
  // painel de controle que escreve essa configuração.
  //
  // O que continua valendo do vizinho que já mexe no menu lateral: fail-open
  // sempre, guarda global PRÓPRIA (nunca a dele), zero tráfego novo com o
  // servidor, e nada de varredura profunda do shadow DOM.
  const CHAVE_STORE = "mw_sky";

  const SKY_DEFAULTS = {
    entity: null,
    ativo: true,
    superficies: ["cabecalho"],
    intensidade: 0.85,
    escopo: "todos", // "todos" | "lista"
    dashboards: [],
  };

  const painelAtual = () => {
    // "/lovelace/0" → "lovelace" (a Home padrão) · "/clima-3-0/agora" → "clima-3-0"
    const partes = String(location.pathname || "").split("/").filter(Boolean);
    return partes[0] || "lovelace";
  };

  const MwSky = {
    cfg: null,
    _chave: null,
    _ligado: false,
    _relogio: null,

    raiz() {
      try {
        const r = document.querySelector("home-assistant");
        return { r, main: r && r.shadowRoot.querySelector("home-assistant-main") };
      } catch (_) {
        return { r: null, main: null };
      }
    },

    hass() {
      try {
        return document.querySelector("home-assistant")?.hass || null;
      } catch (_) {
        return null;
      }
    },

    alcanca() {
      const c = this.cfg;
      if (!c || !c.ativo) return false;
      if (c.escopo === "todos") return true;
      return (c.dashboards || []).includes(painelAtual());
    },

    folha(alvo) {
      // Uma folha por alvo. `document.head` para as variáveis de tema (que
      // atravessam tudo) e outra dentro do shadow root do `hui-root`, que é
      // onde o cabeçalho realmente mora.
      const dono = alvo || document.head;
      let f = dono.querySelector
        ? dono.querySelector("style#mw-sky-style")
        : null;
      if (!f) {
        f = document.createElement("style");
        f.id = "mw-sky-style";
        dono.appendChild(f);
      }
      return f;
    },

    huiRoot() {
      try {
        const { main } = this.raiz();
        if (!main) return null;
        const drawer = main.shadowRoot.querySelector("ha-drawer");
        const resolver =
          (drawer && drawer.querySelector("partial-panel-resolver")) ||
          main.shadowRoot.querySelector("partial-panel-resolver");
        const painel = resolver && resolver.querySelector("ha-panel-lovelace");
        const root = painel && painel.shadowRoot?.querySelector("hui-root");
        return root?.shadowRoot || null;
      } catch (_) {
        return null;
      }
    },

    // Mistura a cor com o mesmo azul-quase-preto do véu do card. É isto que
    // torna a tinta branca legível: sem ele, um meio-dia de céu limpo deixava
    // o título do dashboard em 2,84:1 e os ícones de editar e de menu em
    // 1,45:1 — e isso atinge QUEM NEM TEM O CARD NA TELA, porque o pintor é
    // da casa inteira. Medido pelo inspetor de design em 2026-09-10.
    escurecer(hex, k) {
      try {
        const n = hex.replace("#", "");
        const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
        const alvo = [8, 12, 22];
        const m = c.map((v, i) => Math.round(v * (1 - k) + alvo[i] * k));
        return `#${m.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      } catch (_) {
        return hex;
      }
    },

    regras(paleta, alfa, superficies) {
      // A intensidade entra como MISTURA, não como `opacity` no elemento:
      // `opacity` desbota o texto junto com o fundo, e foi assim que os ícones
      // do cabeçalho foram parar em 1,45:1.
      const k = 0.35 + 0.30 * Math.max(0, Math.min(1, alfa));
      const p = paleta.map((c) => this.escurecer(c, k));
      const regras = [
        `:root{--mw-sky-1:${p[0]};--mw-sky-2:${p[1]};--mw-sky-3:${p[2]};}`,
      ];
      if (superficies.includes("cabecalho")) {
        // Valor LITERAL, não `var()`: o app companion iOS/Android não resolve
        // `var()` nas variáveis de shell. E a ponta ESCURA da paleta, porque o
        // degradê de 120° joga a clara na direita, onde moram o lápis e o menu.
        regras.push(
          `:root{--app-header-background-color:${p[0]};` +
            `--app-header-text-color:#fff;--mdc-theme-primary:#fff;}`
        );
        regras.push(
          `.header, .toolbar, app-header, app-toolbar{` +
            `background-image:linear-gradient(120deg,${p[0]},` +
            `${p[1]} 60%,${p[2]});` +
            `transition:background-image .8s ease;}`
        );
      }
      if (superficies.includes("menu")) {
        regras.push(
          `:root{--sidebar-background-color:${p[0]};` +
            `--sidebar-text-color:#e9eef5;--sidebar-icon-color:#c9d6e6;}`
        );
      }
      if (superficies.includes("fundo")) {
        regras.push(
          `:root{--lovelace-background:linear-gradient(180deg,${p[0]},${p[2]});}`
        );
      }
      return regras.join("\n");
    },

    pintar(forcar) {
      // FAIL-OPEN: qualquer erro devolve o cabeçalho nativo, em silêncio.
      try {
        if (!this.alcanca()) return this.despintar();
        const hass = this.hass();
        const d = hass && lerTempo(hass, this.cfg.entity);
        if (!d) return;
        const agora = new Date();
        const lat = num(hass.config && hass.config.latitude) ?? 0;
        const lon = num(hass.config && hass.config.longitude) ?? 0;
        const sol = posicaoSolar(agora, lat, lon);
        const ceu = CEU_POR_CONDICAO[d.estado] || "nuvem";
        const noite =
          d.estado === "clear-night" ? true : d.estado === "sunny" ? false : null;
        const paleta = paletaDoCeu(ceu, sol.elevacao, noite);
        const sup = this.cfg.superficies || [];
        const chave = [
          d.estado,
          agora.getHours(),
          sup.join(","),
          this.cfg.intensidade,
          painelAtual(),
        ].join("|");
        if (!forcar && chave === this._chave) return;
        this._chave = chave;

        const alfa = Math.max(0, Math.min(1, num(this.cfg.intensidade) ?? 0.85));
        const css = this.regras(paleta, alfa, sup);
        this.folha(document.head).textContent = css;
        // A folha global não atravessa shadow root: o cabeçalho precisa da
        // dele, e ela some a cada troca de painel — por isso reinjetamos na
        // navegação em vez de confiar que ficou.
        if (sup.includes("cabecalho")) {
          const alvo = this.huiRoot();
          if (alvo) this.folha(alvo).textContent = css;
        }
      } catch (_) {
        /* sem céu é melhor que sem cabeçalho */
      }
    },

    despintar() {
      try {
        this._chave = null;
        document.head.querySelector("style#mw-sky-style")?.remove();
        this.huiRoot()?.querySelector("style#mw-sky-style")?.remove();
      } catch (_) {
        /* fail-open */
      }
    },

    async carregar() {
      // Configuração no `frontend/set_user_data`: é por usuário, que é o
      // mesmo desenho em camadas do MW Sidebar, e não exige integração
      // nenhuma para o card funcionar sozinho.
      try {
        const hass = this.hass();
        if (!hass) return null;
        const r = await hass.connection.sendMessagePromise({
          type: "frontend/get_user_data",
          key: CHAVE_STORE,
        });
        return (r && r.value) || null;
      } catch (_) {
        return null;
      }
    },

    async guardar(cfg) {
      this.cfg = { ...SKY_DEFAULTS, ...cfg };
      try {
        const hass = this.hass();
        await hass.connection.sendMessagePromise({
          type: "frontend/set_user_data",
          key: CHAVE_STORE,
          value: this.cfg,
        });
      } catch (_) {
        /* guardar falhou: o céu desta sessão continua valendo */
      }
      this.ligar();
      this.pintar(true);
    },

    ligar() {
      if (this._ligado) return;
      this._ligado = true;
      const repintar = () => setTimeout(() => this.pintar(true), 60);
      // Navegação: o HA dispara `location-changed` na SPA, e o `popstate`
      // cobre o botão de voltar. Sem laço, sem observer profundo.
      window.addEventListener("location-changed", repintar);
      window.addEventListener("popstate", repintar);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.pintar(true);
      });
      // Relógio lento: o céu muda com a HORA, não com o estado. 5 min é o
      // suficiente e some quando a aba está oculta.
      this._relogio = setInterval(() => {
        if (!document.hidden) this.pintar(false);
      }, 5 * 60 * 1000);
    },

    async iniciar() {
      if (this.cfg) return;
      const guardado = await this.carregar();
      if (!guardado || !guardado.entity) return;
      this.cfg = { ...SKY_DEFAULTS, ...guardado };
      this.ligar();
      this.pintar(true);
    },
  };

  // Guarda global própria: o plugin de menu da casa tem a dele, e os dois
  // precisam de contadores separados para um não desligar o outro.
  if (!globalThis.__MW_SKY) {
    globalThis.__MW_SKY = MwSky;
    // Espera o `home-assistant` existir antes de tentar ler o hass.
    const tentar = (n) => {
      if (globalThis.__MW_SKY.hass()) {
        globalThis.__MW_SKY.iniciar();
      } else if (n < 20) {
        setTimeout(() => tentar(n + 1), 250 * (n + 1));
      }
    };
    tentar(0);
  }

  // O card virou o PAINEL DE CONTROLE do céu: ele não pinta, ele configura.
  // Continua de altura zero e continua sendo opcional — sem ele, quem já
  // configurou uma vez continua com o céu, porque a configuração é guardada.
  class SkyCard extends HTMLElement {
    setConfig(config) {
      this._config = { ...SKY_DEFAULTS, ...config };
      if (!this._config.entity) {
        throw new Error("Informe `entity`: a entidade `weather.` que pinta o céu.");
      }
      this.style.display = "none";
      this._aplicado = null;
    }

    set hass(hass) {
      this._hass = hass;
      this._aplicar();
    }

    getCardSize() {
      return 0;
    }

    static getConfigElement() {
      return document.createElement("mw-leticia-sky-card-editor");
    }

    static getStubConfig(hass) {
      const id = Object.keys(hass && hass.states ? hass.states : {}).find((k) =>
        k.startsWith("weather.")
      );
      return {
        type: "custom:mw-leticia-sky-card",
        entity: id || "",
        escopo: "todos",
        superficies: ["cabecalho", "menu"],
      };
    }

    connectedCallback() {
      this._aplicar();
    }

    _aplicar() {
      if (!this._config || !this._hass) return;
      const assinatura = JSON.stringify(this._config);
      if (assinatura === this._aplicado) return;
      this._aplicado = assinatura;
      // Escrever a configuração é o único trabalho do card. Quem pinta — e
      // quem continua pintando depois que a view fecha — é o singleton.
      const sky = globalThis.__MW_SKY;
      if (sky) sky.guardar(this._config);
    }
  }

  // ── editores ──────────────────────────────────────────────────────────────
  const criarEditor = (nome, esquema, padroes) =>
    class extends HTMLElement {
      setConfig(config) {
        this._config = { ...config };
        this._renderar();
      }
      set hass(hass) {
        this._hass = hass;
        if (this._form) this._form.hass = hass;
      }
      _renderar() {
        if (!this._form) {
          this._form = document.createElement("ha-form");
          this._form.computeLabel = (f) => LABELS[f.name] || f.name;
          this._form.addEventListener("value-changed", (ev) => {
            ev.stopPropagation();
            const limpo = { type: this._config.type, entity: this._config.entity };
            for (const [k, v] of Object.entries({ ...ev.detail.value })) {
              if (v === undefined || v === null || v === "") continue;
              if (JSON.stringify(v) !== JSON.stringify(padroes[k])) limpo[k] = v;
            }
            this.dispatchEvent(
              new CustomEvent("config-changed", {
                bubbles: true,
                composed: true,
                detail: { config: limpo },
              })
            );
          });
          this.appendChild(this._form);
        }
        if (this._hass) this._form.hass = this._hass;
        this._form.schema = esquema;
        const dados = { ...padroes, ...this._config };
        for (const k of Object.keys(dados)) {
          if (dados[k] === "" || dados[k] === null) delete dados[k];
        }
        this._form.data = dados;
      }
    };

  const ESQUEMA_CARD = [
    { name: "entity", selector: { entity: { domain: "weather" } } },
    { name: "name", selector: { text: {} } },
    {
      name: "layout",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "faixa", label: "Faixa compacta" },
            { value: "hoje", label: "Hoje (com a fita das horas)" },
            { value: "semana", label: "Semana" },
            { value: "completo", label: "Completo" },
            { value: "alerta", label: "Só a faixa de alertas" },
          ],
        },
      },
    },
    { name: "ceu_animado", selector: { boolean: {} } },
    { name: "mostrar_banda", selector: { boolean: {} } },
    { name: "mostrar_alertas", selector: { boolean: {} } },
    { name: "mostrar_ar", selector: { boolean: {} } },
    { name: "horas", selector: { number: { min: 6, max: 48, step: 1, mode: "box" } } },
    { name: "dias", selector: { number: { min: 3, max: 16, step: 1, mode: "box" } } },
  ];

  // Editor do céu: precisa da LISTA DE DASHBOARDS da casa, que só existe no
  // WebSocket. Por isso ele não usa o editor genérico — monta o próprio
  // esquema depois de perguntar ao HA quais telas existem.
  class SkyEditor extends HTMLElement {
    setConfig(config) {
      this._config = { ...SKY_DEFAULTS, ...config };
      this._renderar();
    }

    set hass(hass) {
      const primeiro = !this._hass;
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      if (primeiro) this._buscarDashboards();
    }

    async _buscarDashboards() {
      try {
        const lista = await this._hass.connection.sendMessagePromise({
          type: "lovelace/dashboards/list",
        });
        // A Home padrão não vem na lista: ela é o painel `lovelace`, que
        // existe sempre e é justamente a tela que o dono mais olha.
        this._dashboards = [
          { value: "lovelace", label: "Home padrão" },
          ...(lista || [])
            .filter((d) => d.url_path)
            .map((d) => ({ value: d.url_path, label: d.title || d.url_path })),
        ];
      } catch (_) {
        this._dashboards = [{ value: "lovelace", label: "Home padrão" }];
      }
      this._renderar();
    }

    _schema() {
      const base = [
        { name: "entity", selector: { entity: { domain: "weather" } } },
        { name: "ativo", selector: { boolean: {} } },
        {
          name: "superficies",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: [
                { value: "cabecalho", label: "Barra superior" },
                { value: "menu", label: "Menu lateral" },
                { value: "fundo", label: "Fundo da view (mais caro)" },
              ],
            },
          },
        },
        {
          name: "escopo",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "todos", label: "Em todos os dashboards" },
                { value: "lista", label: "Só nos que eu escolher" },
              ],
            },
          },
        },
      ];
      if (this._config && this._config.escopo === "lista") {
        base.push({
          name: "dashboards",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: this._dashboards || [
                { value: "lovelace", label: "Home padrão" },
              ],
            },
          },
        });
      }
      base.push({
        name: "intensidade",
        selector: { number: { min: 0.2, max: 1, step: 0.05, mode: "slider" } },
      });
      return base;
    }

    _renderar() {
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._mudou(ev));
        this.appendChild(this._form);
        this._ajuda = document.createElement("div");
        this._ajuda.style.cssText =
          "padding:8px 4px 0;font-size:12px;line-height:1.4;" +
          "color:var(--secondary-text-color)";
        this.appendChild(this._ajuda);
      }
      if (this._hass) this._form.hass = this._hass;
      this._form.schema = this._schema();
      const dados = { ...SKY_DEFAULTS, ...this._config };
      for (const k of Object.keys(dados)) {
        if (dados[k] === "" || dados[k] === null) delete dados[k];
      }
      this._form.data = dados;
      this._ajuda.textContent =
        "O céu vale para o Home Assistant inteiro enquanto você estiver num " +
        "dashboard, e continua valendo depois que esta view fechar — a " +
        "configuração fica guardada no seu usuário. Para desligar, use a " +
        "chave acima; remover o card não apaga a configuração.";
    }

    _mudou(ev) {
      ev.stopPropagation();
      const limpo = { type: this._config.type, entity: this._config.entity };
      for (const [k, v] of Object.entries({ ...ev.detail.value })) {
        if (v === undefined || v === null || v === "") continue;
        if (JSON.stringify(v) !== JSON.stringify(SKY_DEFAULTS[k])) limpo[k] = v;
      }
      // `ativo: false` é escolha, não valor padrão que se possa omitir.
      if (ev.detail.value.ativo === false) limpo.ativo = false;
      this._config = { ...this._config, ...ev.detail.value };
      this._renderar();
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          bubbles: true,
          composed: true,
          detail: { config: limpo },
        })
      );
    }
  }

  if (!customElements.get("mw-leticia-weather-card")) {
    customElements.define("mw-leticia-weather-card", WeatherCard);
    customElements.define(
      "mw-leticia-weather-card-editor",
      criarEditor("card", ESQUEMA_CARD, DEFAULTS)
    );
    customElements.define("mw-leticia-sky-card", SkyCard);
    customElements.define("mw-leticia-sky-card-editor", SkyEditor);
  }

  window.customCards = window.customCards || [];
  window.customCards.push(
    {
      type: "mw-leticia-weather-card",
      name: "MW Letícia Weather Card",
      description:
        "Tempo com céu vivo e a BANDA DE CONFIANÇA do conjunto de modelos — " +
        "cinco layouts, do compacto ao completo.",
      preview: true,
      documentationURL: "https://github.com/visaodeempresa/mw-ha-leticia-weather-card",
    },
    {
      type: "mw-leticia-sky-card",
      name: "MW Letícia Sky (céu no cabeçalho)",
      description:
        "Card de altura zero: pinta a barra superior, o menu e o fundo com a " +
        "condição do tempo e a altura real do sol.",
      preview: false,
      documentationURL: "https://github.com/visaodeempresa/mw-ha-leticia-weather-card",
    }
  );

  console.info(
    `%c MW-LETICIA-WEATHER-CARD %c ${VERSION} `,
    "background:#1a1a1a;color:#fdfaf3;font-weight:700;",
    "background:#8fd0ff;color:#1a1a1a;font-weight:700;"
  );
})();
