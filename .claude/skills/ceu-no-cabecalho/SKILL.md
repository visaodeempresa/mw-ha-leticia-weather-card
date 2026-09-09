---
name: ceu-no-cabecalho
description: Mexer no céu que pinta a barra superior, o menu lateral e o fundo da view do Home Assistant (custom:mw-leticia-sky-card), e no card de tempo com a banda de confiança. Use quando o Maycon disser "põe o céu na barra de cima", "o cabeçalho não muda de cor", "o menu ficou ilegível", "a lua está no lugar errado", "quero o fundo da tela com o tempo", "o card de clima ficou pesado", ou quando aparecerem hui-root, app-header, banda de confiança ou spread no assunto deste repositório.
---

# Céu no cabeçalho e card de tempo

Dois tipos num arquivo só. A fábrica geral está em
**`mw-clima`** (canônica no harness, publicada em `~/.claude/skills`).

## Pré-condições

| Preciso de | Como obter | Se faltar |
|---|---|---|
| Bancada | `preview_start` com `bancada-weather-card` (porta 8795) | não dá para olhar |
| `weather.` com spread | integração `mw_leticia_weather` instalada | o card funciona, mas **sem** a banda (é de propósito) |
| Convivência com o MW Sidebar | nada a fazer: guardas separadas | dois módulos brigando pelo menu |

## As três rotas de pintura (da barata para a cara)

1. Variáveis de tema (`--app-header-background-color`, `--sidebar-background-color`).
   **O app companion não resolve `var()`** — valor literal.
2. `<style>` no `document.head` — não atravessa shadow root.
3. `<style>` no shadow root do `hui-root`, travessia nomeando cada salto:
   `home-assistant → home-assistant-main → ha-drawer → partial-panel-resolver →
   ha-panel-lovelace → hui-root`.

Detalhes em `IA/knowledge/ha-pintar-cabecalho-e-menu.md`; a decisão, no ADR 0019.

## Armadilhas (com sintoma)

| Sintoma | Causa | Correção |
|---|---|---|
| O céu some e o cabeçalho volta ao normal | fail-open engoliu erro de sintaxe | `node --check` no arquivo **baixado do servidor** |
| Lua desenhada em céu azul | a paleta olhou só a altura do sol | `clear-night` no estado força noite |
| Sol ou lua ovais | SVG esticado (`preserveAspectRatio="none"`) | os astros são `<div>` redondos em HTML, não SVG |
| A lua fica em cima da linha de temperatura | astro posicionado em % da altura do card, que muda com o layout | faixa de **altura fixa** (118 px) no topo |
| Texto ilegível ao meio-dia | branco sobre céu claro | o véu `.ceu::after` é requisito, não enfeite |
| A banda de confiança não aparece | a entidade não publica `confianca_spread` | **correto**: sem spread medido, não se desenha incerteza |
| O menu fica ilegível | `--sidebar-text-color` não acompanhou o fundo | as duas variáveis andam juntas |

## Verificação

```bash
node --check dist/mw-leticia-weather-card.js && node tools/probe.js
```
Esperado: `tudo verde`, incluindo a checagem de astronomia (sol alto ao meio-dia
em Brasília, abaixo do horizonte à meia-noite, e latitude mudando o resultado).
Na bancada, o botão «sem a integração MW» tem de fazer a banda sumir **sem**
quebrar o card.
