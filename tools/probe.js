/* Probe headless GENÉRICO — instancia o componente fora do navegador com um
 * shim mínimo de DOM. Não conhece as regras deste card/elemento: só garante
 * que o arquivo carrega, registra o custom element, aceita uma config mínima
 * e oferece editor. É o piso, não o teto — assim que houver comportamento que
 * dói perder (cor por estado, geometria, otimismo do toque), acrescente
 * verificações específicas aqui. Ver IA/lib/mw-devops/README.md.
 *
 * Roda no CI e antes de qualquer PR:  node tools/probe.js
 *
 * GERADO por IA/tools/mw-devops.sh na primeira aplicação; a partir daí é
 * SEU — o script nunca sobrescreve um probe existente.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const mkStyle = () => {
  const s = { _p: {} };
  s.setProperty = (k, v) => { s._p[k] = v; s[k] = v; };
  s.removeProperty = (k) => { delete s._p[k]; delete s[k]; };
  return s;
};

class Node {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.style = mkStyle();
    this.children = [];
    this.dataset = {};
    this._attrs = {};
    this._listeners = {};
  }
  appendChild(n) { this.children.push(n); return n; }
  append(...n) { n.forEach((x) => this.children.push(x)); }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
  removeAttribute(k) { delete this._attrs[k]; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent() { return true; }
  emit(t, ev) { (this._listeners[t] || []).forEach((f) => f(ev)); }
  querySelector() { return new Node("div"); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0 }; }
  attachInternals() { return {}; }
}

global.Node = Node;
global.HTMLElement = class extends Node {
  attachShadow() {
    this.shadowRoot = new Node("shadow-root");
    this.shadowRoot.adoptedStyleSheets = [];
    this.shadowRoot.innerHTML = "";
    return this.shadowRoot;
  }
};
const reg = {};
global.customElements = {
  define: (n, c) => { reg[n] = c; },
  get: (n) => reg[n],
  whenDefined: () => Promise.resolve(),
};
global.document = {
  createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => new Node(t),
  head: new Node("head"),
  body: new Node("body"),
};
global.window = { customElements: global.customElements, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
global.CustomEvent = class { constructor(t, d) { this.type = t; Object.assign(this, d); } };
global.Event = global.CustomEvent;
global.CSSStyleSheet = class { replaceSync(css) { this.css = css; } };
global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.cancelAnimationFrame = clearTimeout;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
console.info = () => {};

const root = path.join(__dirname, "..");
const asset = require(path.join(root, "hacs.json")).filename;
const src = fs.readFileSync(path.join(root, "dist", asset), "utf8");

let fails = 0;
const check = (label, cond, extra = "") => {
  if (cond) { console.log(`  ok   ${label}`); return true; }
  fails += 1;
  console.log(`  FAIL ${label}${extra ? " — " + extra : ""}`);
  return false;
};

console.log(`carga (${asset}):`);
let loaded = true;
try { eval(src); } catch (e) { loaded = false; console.log(`  FAIL o arquivo não carrega — ${e.message}`); fails += 1; }

if (loaded) {
  const names = Object.keys(reg);
  check("registra pelo menos um custom element", names.length > 0, names.join(", "));

  const main = names.filter((n) => !n.endsWith("-editor"))[0];
  const editor = names.filter((n) => n.endsWith("-editor"))[0];

  if (main) {
    console.log(`componente (${main}):`);
    let inst = null;
    try { inst = new reg[main](); } catch (e) { check("instancia", false, e.message); }
    if (inst) {
      check("instancia sem explodir", true);
      check("tem setConfig", typeof inst.setConfig === "function");
      check("recusa config vazia", (() => {
        try { inst.setConfig({}); return false; } catch (_) { return true; }
      })(), "setConfig({}) deveria lançar");
      check("oferece editor visual",
        typeof reg[main].getConfigElement === "function",
        "static getConfigElement() ausente");
    }
  }

  if (editor) {
    console.log(`editor (${editor}):`);
    try {
      const ed = new reg[editor]();
      check("editor instancia sem explodir", true);
      check("editor tem setConfig", typeof ed.setConfig === "function");
    } catch (e) { check("editor instancia", false, e.message); }
  } else {
    check("registra um *-editor", false, "sem editor o card não é configurável pela tela");
  }
}

console.log("versão:");
check(
  "banner/const de versão presente",
  /(%c\s*v?\d+\.\d+\.\d+|VERSION\s*=\s*["\']\d+\.\d+\.\d+["\'])/.test(src),
  "o auto-release precisa achar a versão para sincronizar"
);

/* ── verificações próprias deste pacote ──────────────────────────────────── */

console.log("pacote de dois tipos:");
const tipos = Object.keys(reg).filter((n) => !n.endsWith("-editor"));
check("registra os DOIS tipos num arquivo só",
  tipos.includes("mw-leticia-weather-card") && tipos.includes("mw-leticia-sky-card"),
  tipos.join(", "));
check("cada tipo tem seu editor",
  !!reg["mw-leticia-weather-card-editor"] && !!reg["mw-leticia-sky-card-editor"]);
check("os dois entram no seletor de cards do HA",
  (src.match(/type:\s*"mw-leticia-/g) || []).length >= 2);

console.log("contratos de configuração:");
const cartao = new reg["mw-leticia-weather-card"]();
check("recusa entidade que não é weather.", (() => {
  try { cartao.setConfig({ entity: "sensor.qualquer" }); return false; } catch (_) { return true; }
})(), "um sensor comum não tem previsão");
check("recusa layout inventado", (() => {
  try { cartao.setConfig({ entity: "weather.x", layout: "bonito" }); return false; }
  catch (_) { return true; }
})());
check("aceita a config mínima", (() => {
  try { cartao.setConfig({ entity: "weather.casa" }); return true; } catch (_) { return false; }
})());
const ceuCard = new reg["mw-leticia-sky-card"]();
check("o card do céu tem altura zero", (() => {
  ceuCard.setConfig({ entity: "weather.casa" });
  return ceuCard.getCardSize() === 0;
})(), "ele não ocupa lugar na view: só pinta");

console.log("astronomia:");
const astro = eval(
  "(() => {\nconst RAD = Math.PI / 180;\n" +
    src.split("const RAD = Math.PI / 180;")[1].split("// ── paleta do céu")[0] +
    "\nreturn { posicaoSolar, faseLunar };\n})()"
);
// Brasília, meio-dia local de 09/09/2026 → sol alto; meia-noite → sol abaixo.
const meioDia = astro.posicaoSolar(new Date("2026-09-09T15:00:00Z"), -15.84, -48.04);
const meiaNoite = astro.posicaoSolar(new Date("2026-09-09T03:00:00Z"), -15.84, -48.04);
check("ao meio-dia em Brasília o sol está alto", meioDia.elevacao > 55,
  meioDia.elevacao.toFixed(1) + "°");
check("à meia-noite o sol está abaixo do horizonte", meiaNoite.elevacao < -30,
  meiaNoite.elevacao.toFixed(1) + "°");
// No hemisfério norte, no mesmo instante, a elevação tem de ser diferente —
// senão a conta ignora a latitude e o céu seria igual no mundo inteiro.
const oslo = astro.posicaoSolar(new Date("2026-09-09T15:00:00Z"), 59.9, 10.75);
check("a latitude muda o céu de verdade",
  Math.abs(oslo.elevacao - meioDia.elevacao) > 20);
check("a fase da lua fica entre 0 e 1",
  [0, 1, 2].every((d) => {
    const f = astro.faseLunar(new Date(2026, 8, 9 + d * 7));
    return f >= 0 && f <= 1;
  }));

console.log("desenho e custo:");
check("anima só opacity e transform (a regra da casa)",
  !/@keyframes[^}]*\b(width|height|top|left|margin)\s*:/.test(src));
check("respeita prefers-reduced-motion",
  /prefers-reduced-motion/.test(src) && /animation:\s*none\s*!important/.test(src));
check("sem laço de animação em JS: quem anima é o CSS",
  !/requestAnimationFrame/.test(src) && !/setInterval/.test(src),
  "aba oculta pausa animação de CSS sozinha; timer não");
check(
  "sem varredura profunda do shadow DOM",
  !/queryDeep/.test(src) && !/while\s*\([^)]*shadowRoot/.test(src),
  "a travessia nomeia os elementos um a um; varrer em laço custa caro " +
    "em aparelho lento e quebra a cada versão do frontend"
);
check(
  "a travessia até o cabeçalho nomeia cada salto",
  /home-assistant-main/.test(src) &&
    /partial-panel-resolver/.test(src) &&
    /hui-root/.test(src)
);
check("o céu falha para fora (fail-open)",
  (src.match(/catch \(_\)/g) || []).length >= 4,
  "sem céu é melhor que sem cabeçalho");
check("guarda própria, não colide com o MW Sidebar",
  /__MW_SKY_ATIVO/.test(src) && !/__MW_SIDEBAR/.test(src));
check("cancela a assinatura de previsão ao sair da tela",
  /disconnectedCallback/.test(src) && /_cancelar/.test(src),
  "assinatura pendurada é vazamento");
check("escapa texto que vem do estado",
  /const esc = /.test(src) && /esc\(a\.titulo\)/.test(src),
  "título de alerta é texto de terceiro; entra escapado");

console.log("honestidade:");
check("a banda só aparece quando há spread medido",
  /d\.spread !== null && d\.spread > 0/.test(src),
  "inventar incerteza é tão ruim quanto escondê-la");
check("alerta derivado se anuncia como derivado",
  /cálculo derivado da previsão/.test(src));
check("usa a escala canônica de temperatura (regra 40)",
  /mw-climate-scale v1/.test(src) && /mwClimateColor\("temp"/.test(src));

console.log(fails ? `\n${fails} FALHA(S)` : "\ntudo verde");
process.exit(fails ? 1 : 0);
