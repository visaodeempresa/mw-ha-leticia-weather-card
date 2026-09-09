<!-- MW-BRAND:BEGIN — gerado por IA/tools/mw-brand.sh · não editar à mão -->
<p align="center">
  <a href="https://github.com/visaodeempresa">
    <img src="https://mayconsoftware.github.io/assets/ve/LOGO_VISAO_DE_EMPRESA_HEIGHT-64px.png" alt="Visão de Empresa — MAYCON WILLIAN OLIVEIRA" height="64">
  </a>
  <br>
  <sub><b>Visão de Empresa</b> · componente de Home Assistant por MAYCON WILLIAN OLIVEIRA</sub>
</p>
<!-- MW-BRAND:END -->

# MW Letícia Weather Card

**Dois tipos de card num arquivo só:**

| | |
|---|---|
| `custom:mw-leticia-weather-card` | o tempo, em cinco layouts, com céu vivo e a **banda de confiança** do conjunto de modelos |
| `custom:mw-leticia-sky-card` | card de **altura zero** que pinta a barra superior, o menu e o fundo com a condição do tempo e a altura real do sol |

## O que ele desenha e nenhum outro desenha: a discórdia

Em 09/09/2026, no mesmo minuto, cinco aplicativos discordaram em **4 °C** sobre
o mesmo quintal. Um número sozinho mente por omissão.

Este card desenha a linha das próximas horas **com a nuvem p10–p90 do conjunto
de modelos por trás**. Quando os modelos discordam, a faixa engorda e a etiqueta
diz `± X °C · modelos discordam`. Quando concordam, ela some sozinha.

A banda só aparece se houver spread **medido** — com uma entidade `weather.`
comum, o card desenha a linha e pronto. **Inventar incerteza é tão ruim quanto
escondê-la.**

## Layouts

| `layout` | |
|---|---|
| `faixa` | tira compacta: ícone, número, condição |
| `hoje` (padrão) | número grande, medidas e a fita das próximas 24 h com a banda |
| `semana` | 3 a 16 dias, barras mín/máx na **escala canônica de temperatura** da casa |
| `completo` | tudo, mais qualidade do ar e UV |
| `alerta` | só a faixa de avisos, para o topo de um dashboard |

## O céu

Sol e lua na **posição real** (declinação e ângulo horário calculados da
latitude, da longitude e da hora), com a **fase da lua desenhada**. A paleta sai
de *(condição × altura do sol)* — nunca da hora do relógio, que mente perto dos
trópicos e mente muito longe deles.

Estrelas, nuvens, chuva e raio são animação de **CSS**, não laço de JavaScript:
o compositor cuida deles na GPU, a aba oculta pausa sozinha e
`prefers-reduced-motion` desliga tudo. **Zero trabalho por quadro.**

## O céu no cabeçalho e no menu

```yaml
type: custom:mw-leticia-sky-card
entity: weather.tempo_aguas_claras
superficies: [cabecalho, menu]
```

Card de altura zero: enquanto a view estiver aberta, pinta; ao sair, desfaz.
Nasce **desligado** — só existe onde alguém o colocar.

Duas rotas, nesta ordem: primeiro as variáveis de tema
(`--app-header-background-color`, `--sidebar-background-color`), que são baratas
e estáveis; depois, quando a rota declarativa não alcança, um `<style>` no
shadow root do `hui-root`, com a travessia nomeando cada salto.

**Fail-open sempre**: qualquer erro devolve o cabeçalho nativo, em silêncio.
Guarda própria (`__MW_SKY_ATIVO`) para conviver com o MW Sidebar.

> ⚠️ Terreno novo, e isso está dito: nenhum outro componente desta casa tocava
> a barra superior. As armadilhas do `hui-root` ainda estão sendo mapeadas.

## Opções

| Opção | Padrão | |
|---|---|---|
| `entity` | — | **obrigatória**, domínio `weather.` |
| `layout` | `hoje` | ver acima |
| `ceu_animado` | `true` | desliga o movimento sem desligar o céu |
| `mostrar_banda` | `true` | a nuvem de incerteza |
| `mostrar_alertas` | `true` | a faixa de avisos |
| `mostrar_ar` | `true` | AQI, PM2.5 e UV no layout `completo` |
| `horas` · `dias` | `24` · `7` | tamanho da fita e da semana |
| `superficies` | `[cabecalho]` | (sky) `cabecalho`, `menu`, `fundo` |
| `intensidade` | `0.85` | (sky) opacidade do degradê |

## Funciona com qualquer `weather.`

Com a integração
[`mw-ha-leticia-weather`](https://github.com/visaodeempresa/mw-ha-leticia-weather)
o card ganha a banda de confiança, os alertas oficiais e derivados, e a fala.
Sem ela, funciona igual — só sem essas três camadas. **Degradar em silêncio é
requisito, não acidente.**

## Instalação

HACS → Repositórios personalizados → `visaodeempresa/mw-ha-leticia-weather-card`,
categoria **Dashboard**.

## Verificação

```bash
node --check dist/mw-leticia-weather-card.js
node tools/probe.js
```

Saída esperada: `tudo verde`. Bancada visual em `bancada.html` — quatro layouts,
dois temas, quatro condições, com e sem alerta, e o cenário «sem a integração
MW» que prova a degradação silenciosa.

## Licença

MIT · © 2026 MAYCON WILLIAN OLIVEIRA
