# Inspeção de desenho e custo de tela — 09/09/2026

Cards: `mw-ha-leticia-weather-card` · `mw-ha-barometer-card`
Bancadas: `bancada-weather-card` (8795) · `bancada-barometer` (8794)

## Calibração (regra 140)

Régua rodada primeiro em `mw-ha-temp-humidity-card` (aceito pelo dono).

| item medido | valor | veredito da régua |
|---|---|---|
| todo texto do card | 8,4 – 16,1 : 1 | passa |
| ícone `mdi:battery-60` `#9CCC65` sobre branco | **1,87 : 1** | seria reprova |
| texto «64%» ao lado do mesmo ícone | 16,1 : 1 | passa |
| altura do card | 51,6 px (alvo do card inteiro ≥ 44) | passa |

**Duas correções na régua, porque o limite reprovava o aceito:**

1. Ícone cuja informação está escrita ao lado em ≥ 4,5:1 é **redundante** e fica
   isento do piso de 3:1. Sem isso o card aceito reprovaria pelo ícone de bateria.
2. O contraste passou a ser medido com **fundo em pixel** (anel de 6 px em volta
   da caixa, moda de cor) e **tinta declarada × opacidade acumulada**. Degradê e
   véu não se calculam por CSS; e a moda *dentro* da caixa vira cinza de
   antialias em fonte pequena (media 8,4 onde o valor real é 16,1).
   Em SVG a tinta é `fill`, não `color` — medir `color` num mostrador escuro dava
   1,24:1 falso.

Depois de calibrada, a régua **aprova o card aceito em tudo**.

---

## Achados

### BLOQUEIA — o texto sobre o céu claro não chega a 4,5:1; o véu está invertido

- **onde:** `mw-leticia-weather-card`, `.ceu::after`, `dist/mw-leticia-weather-card.js:341-343`
- **medida:** o véu é `rgba(8,12,22,.34)` no topo, **`.10` aos 45%** e `.30` no
  fim — mais forte justo onde o céu já é escuro (`paleta[0]`) e mais fraco onde
  ele clareia. O contraste cai com a profundidade:

  | y no card (layout `hoje`) | elemento | sol | neve | nevoeiro |
  |---|---|---|---|---|
  | 14 | `.local` «Águas Claras» | 4,19 | 5,77 | 6,88 |
  | 76 | `.cond` | **2,66** | **3,06** | **3,87** |
  | 107–133 | `.medidas` (83% · 6 km/h · 1019,0 hPa · UV) | **2,38** | **2,74** | **3,49** |
  | 178–241 | rótulos da fita | **2,29** | **2,43** | **2,92** |

  Varredura completa (73 textos × 8 condições, 1180 px):
  `sunny` 71/73 reprovados · `snowy` 67/73 · `cloudy` 45/73 · `partlycloudy`
  47/73 · `fog` 58/73. `clear-night` 0/73, `rainy` 1/73, `lightning-rainy` 1/73.
  Pior caso absoluto **1,70:1**.
  Nota: `snowy` (`#d3dae1` no pé) é mais claro que a paleta `dia`, então limita
  o pior caso por cima — meio-dia de verão não fica pior que o medido.
- **conserto (medido, não chutado):**
  `.ceu::after { background: linear-gradient(180deg, rgba(8,12,22,.40), rgba(8,12,22,.56) 45%, rgba(8,12,22,.62)); }`
  Resultado com esse véu: `fog`/`cloudy`/`partlycloudy`/`rainy`/`lightning-rainy`/`clear-night`
  **0 reprovados**; `sunny` e `snowy` 2 reprovados cada, em 4,09–4,42 (só o que
  cai debaixo do sol — ver achado seguinte).
  O véu intermediário `.34/.46/.52` melhora mas não resolve (sunny 22/73).

### BLOQUEIA — o disco do sol/lua é desenhado por cima do conteúdo

- **onde:** `.astros` / `.sol` / `.lua`, `dist/mw-leticia-weather-card.js:311-315` e `557-561`
- **medida:** com `sunny` em 1180 px, o disco fica em **(235, 39) do card, 34×34
  px** (mais halo `box-shadow 0 0 26px 12px`) **nos quatro layouts**, porque a
  faixa `.astros` tem altura fixa de 118 px e a posição sai só de azimute/elevação.
  Colisões medidas:

  | layout | colide com | contraste sob o disco |
  |---|---|---|
  | `faixa` | «sol · 83% de umidade» | 2,21 |
  | `semana` | «19°» e «17°» das linhas | **1,70** |
  | `hoje` / `completo` | chip «±1,3 °C · modelos discordam» | 2,86 |

  Em 390 px (card 358) a colisão continua, no mesmo lugar.
- **conserto:** limitar o astro à faixa que não tem texto — travar `y` do astro
  entre 8 e 34 px e `x` fora da coluna do conteúdo, **ou** dar ao `.conteudo` um
  scrim próprio (`background: linear-gradient(90deg, rgba(8,12,22,.45), transparent 70%)`)
  em vez de contar com o véu do céu, que não sabe onde o texto está.

### BLOQUEIA — alerta novo não aparece na tela

- **onde:** `_atualizar()`, chave de render, `dist/mw-leticia-weather-card.js:690-700`
- **medida:** a chave é `[estado, temperatura, umidade, spread, nº de previsões,
  1ª datetime, layout, hora]`. **Não inclui os alertas nem a qualidade do ar.**
  Teste na bancada, sem tocar em `_chave` (o que o HA faz é só entregar um `hass`
  novo): alertas na tela antes `[0,0,0,0]` → depois do `hass` com 2 alertas
  `[0,0,0,0]` → só com `_chave=null` forçado `[2,2,2,2]`.
  Um card que desenha aviso de tempestade e não redesenha quando o aviso chega
  está mentindo enquanto a temperatura não mexer.
- **conserto:** somar à chave `d.alertas`, um resumo da lista
  (`alertas.map(a=>a.severidade+a.titulo).join('|')`) e `ar.pm25 + '/' + ar.aqi`.

### IMPORTANTE — a fita horária escreve em 8 px e 9 px

- **onde:** `_fita()`, `dist/mw-leticia-weather-card.js:889` e `:892`
- **medida:** `font-size="8"` (rótulo de hora) e `font-size="9"` (temperatura),
  em `viewBox` de 300 esticado à largura do card. Renderizado: 8,0/9,0 px em card
  de 340; **5,3/6,0 px em card de 200**. Contraste 2,29–2,51 no céu claro.
- **conserto:** `font-size="11"` na hora e `font-size="12"` na temperatura, e
  reduzir de 6 para 4 rótulos de hora para caber.

### IMPORTANTE — «sem previsão» some calado

- **onde:** `_fita()` devolve `""` com menos de 3 pontos; `_semana()` idem
- **medida:** zerando a previsão, o layout `semana` vira um card de **28 px de
  altura** com céu e nada dentro; `hoje` cai de 268 para 164 px sem uma palavra.
  Nenhum texto de estado (`sem previs|indispon|—` não casa com nada).
- **conserto:** `.vazio` dentro do `.conteudo` com «Previsão indisponível» em
  `var(--mw-ceu-tinta,#fff)` — estado, não erro, e não sumiço.

### IMPORTANTE — corta abaixo de 220 px de card

- **onde:** `.faixa` e `.topo`, com `ha-card { overflow: hidden }`
- **medida:** varredura de 180 a 340 px. Em **200 px** `.faixa` precisa de 180 e
  tem 168; `.topo` precisa de 174 e tem 168 — clipa sem reticências e sem quebra.
  Em **220 px** já está limpo. Em 390 px de viewport com card de 358 não corta.
  Só morde em coluna estreita (sections/grid no celular).
- **conserto:** `.faixa, .topo { flex-wrap: wrap }` e `min-width: 0` nos filhos.

### IMPORTANTE — barômetro em 390 px: o mostrador vira decoração

- **onde:** `mw-barometer-card`, `.mostrador`, `dist/mw-barometer-card.js:584`
- **medida:** com o card em 200 px o mostrador fica com **176 px** e a escala
  encolhe junto:

  | largura do card | números hPa | escala mmHg |
  |---|---|---|
  | 320 px (1180) | 13,0 px · 10,7–15,3 : 1 | 8,3–8,9 px · **3,05–4,45 : 1** |
  | 200 px (390)  | **8,8 px** · 9,9–13,1 : 1 | **6,0 px** · 3,4–4,3 : 1 |

  Em 390 px os números do mostrador **não são legíveis**; o mmHg nunca foi, em
  nenhuma largura e em nenhum dos quatro acabamentos.
  O que salva o card: o número grande fora do mostrador («1019,90», 26 px,
  16,1:1) e o `aria-label` completo do botão.
- **conserto:** abaixo de ~240 px de card, esconder a escala secundária
  (`.mmhg { display:none }`) e subir os números de hPa de 13 para 15 unidades de
  `viewBox`; ou trocar para `tamanho: compacto` sem mostrador.
- **o aviso de pressão de estação APARECE em 390 px** — verificado: bloco
  vermelho, texto completo, diz o que fazer. Idem «fora de escala», com o
  ponteiro parado no fim do curso e o texto admitindo o índice preso. Isto está
  certo e é raro.

### POLIMENTO

| o que se vê | onde | medida | conserto |
|---|---|---|---|
| «1019,90» e «1060,00» hPa | `mw-barometer-card:789` `const casas = ... : 2` | 2 casas para sensor de 0,1 hPa; ocupa 151 px de 168 disponíveis em 390 | `casas = 1` |
| ⚠️ emoji no aviso, num card que desenha `ha-icon` | weather `_render`, alerta | emoji não é tintável nem escala com `--mdc-icon-size` | `<ha-icon icon="mdi:alert">` |
| 🌡️ 💧 ⚠️ emoji na tira do barômetro | `mw-barometer-card:793-812` | idem; muda de desenho por plataforma | `ha-icon` `mdi:thermometer` / `mdi:water-percent` |
| ternário morto na cor do número | `mw-barometer-card:799` | `t.tinta === "#ece7dc" ? var(--primary-text-color) : var(--primary-text-color)` — os dois ramos iguais | remover o ternário |
| `faixa` e `semana` não têm `button.abrir` | weather `_faixa`/`_semana` | `hoje` e `completo` têm (79×44, `aria-label` completo); os outros dois não abrem more-info nem por teclado | mesmo botão nos quatro, ou nenhum |
| `.vazio` é o único ponto que depende do tema | weather `:376-378` | `var(--secondary-text-color)` sobre fundo de card não declarado | declarar `background: var(--ha-card-background)` no `.vazio` |

---

## O que está bom, com o número

| eixo | weather | barômetro |
|---|---|---|
| p95 do quadro (excesso sobre a mediana de 16,7 ms) | **0,6 ms** (sol) · **0,9 ms** (tempestade, 72 animações vivas: 56 gotas + 12 nuvens + 4 raios) | **0,4 ms** com o ponteiro mexendo 8× |
| long tasks em 8–10 s | **0** | **0** |
| fps | 60,2 / 60,0 | 60,3 |
| quadros com a aba oculta (3 s) | **0** | **0** |
| `requestAnimationFrame` / `setInterval` / `setTimeout` no código | **nenhum** | **nenhum** |
| propriedades animadas | só `transform` e `opacity` (`mwCintila`, `mwNuvem`, `mwChuva`, `mwRaio`) | só `transform` (transição de 0,9 s do ponteiro) |
| `prefers-reduced-motion: reduce` | 72 animações → **0** | transição 0,9 s → **0 s** |
| alvo de toque | 79×44 px | 296×265 px |
| `aria-label` do alvo | «Águas Claras: 19 graus, céu limpo» | «Barômetro: 1019,90 hPa, estável. Previsão: Bom, possibilidade de pancadas» |
| foco visível | `:focus-visible { outline: 2px solid #fff }` | `:focus-visible { outline: 2px solid var(--primary-color) }` |
| cor de status com rótulo escrito | «**Perigo** · …», «**Perigo potencial** · …» | «**Fora de escala.** …», «pressão de estação» |
| tema escuro | card pinta o próprio céu e a própria tinta — idêntico nos dois temas, sem dependência de tema | os 4 acabamentos declaram paleta inteira (`mostrador`, `tinta`, `tintaFraca`, `ponteiro`, `aro`); `latao-noite` existe |
| cor cravada de tema | só `#fff`/`#ffa600` como *fallback* de `var()`, e as cores do astro | só `#db4437` como *fallback* de `--error-color` |

O achado clássico do aro dourado com paradas fixas que só funciona no claro
**não se aplica**: as quatro paletas do barômetro são completas e sobrevivem aos
dois temas.

---

## O que NÃO foi verificado

- **Ícones reais do MDI.** A bancada usa dublê de emoji em `ha-icon`; tamanho e
  contraste dos ícones de verdade não foram medidos.
- **Tema MW (papel creme).** A bancada carimba as variáveis padrão do HA. O único
  ponto sensível seria o `.vazio` do weather e a tira do barômetro.
- **Assinatura de previsão dentro do HA.** `connection.subscribeMessage` é dublê;
  cancelamento no `disconnectedCallback` foi lido, não exercitado.
- **Toque em aparelho real.** Alvos medidos por `getBoundingClientRect`.
- **Medição de quadro no painel do navegador.** O painel fica oculto entre
  chamadas e não produz quadro (medido: 0 quadros em 10 s). Todas as medidas de
  quadro saíram de Chrome 152 headless na mesma máquina, com CDP — ambiente mais
  rápido que um tablet de parede.
