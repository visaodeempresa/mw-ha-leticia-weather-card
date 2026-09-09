#!/usr/bin/env python3
"""Cria (ou atualiza) o dashboard /clima-3-0 por WebSocket.

Reusa o cliente da casa em vez de escrever mais um: ninguém edita YAML na mão
no HA, e ninguém reescreve o cliente de novo (regra 20).

    python3 tools/criar_clima_3_0.py [--dry-run]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "ha-dashboards" / "scripts"))
from ha_client import HAClient  # noqa: E402

URL_PATH = "clima-3-0"
TITULO = "🌦️ CLIMA 3.0"
TEMPO = "weather.tempo_aguas_claras"
PREFIXO = "sensor.tempo_aguas_claras"


def _card(**kw):
    return kw


def views() -> list[dict]:
    return [
        {
            "title": "Agora",
            "path": "agora",
            "icon": "mdi:weather-partly-cloudy",
            "cards": [
                # O céu no cabeçalho e no menu: card de altura zero, ligado só
                # nesta tela.
                _card(type="custom:mw-leticia-sky-card", entity=TEMPO,
                      superficies=["cabecalho", "menu"], intensidade=0.9),
                _card(type="custom:mw-leticia-weather-card", entity=TEMPO,
                      layout="completo", dias=8),
                _card(type="custom:mw-barometer-card",
                      entity=f"{PREFIXO}_pressao_ao_nivel_do_mar",
                      temperatura_entity=f"{PREFIXO}_temperatura",
                      umidade_entity=f"{PREFIXO}_umidade",
                      vento_entity=f"{PREFIXO}_direcao_do_vento",
                      acabamento="latao", tamanho="grande"),
            ],
        },
        {
            "title": "Semana",
            "path": "semana",
            "icon": "mdi:calendar-week",
            "cards": [
                _card(type="custom:mw-leticia-weather-card", entity=TEMPO,
                      layout="semana", dias=16),
                _card(type="custom:mw-leticia-weather-card", entity=TEMPO,
                      layout="hoje", horas=48),
            ],
        },
        {
            "title": "Confiança",
            "path": "confianca",
            "icon": "mdi:scale-balance",
            # A tela que responde «por que o iPhone diz 20 e o card diz 19».
            "cards": [
                _card(type="markdown", content=(
                    "## Por que os aplicativos discordam\n\n"
                    "Todos olham o mesmo quintal, mas cada um roda um **modelo "
                    "diferente**, num **ponto de grade diferente**, a uma "
                    "**altitude de modelo diferente**. Aqui o número é a mediana "
                    "ponderada de quatro modelos, e a largura da discórdia "
                    "aparece junto — em vez de escondida.")),
                _card(type="entities", title="O conjunto", entities=[
                    {"entity": f"{PREFIXO}_temperatura", "name": "Temperatura fundida"},
                    {"entity": f"{PREFIXO}_confianca_discordia_entre_modelos",
                     "name": "Discórdia entre modelos"},
                    {"entity": f"{PREFIXO}_pressao_ao_nivel_do_mar"},
                    {"entity": f"{PREFIXO}_umidade"},
                    {"entity": f"{PREFIXO}_vento"},
                ]),
                _card(type="history-graph", hours_to_show=48, title="Temperatura e discórdia",
                      entities=[{"entity": f"{PREFIXO}_temperatura"},
                                {"entity": f"{PREFIXO}_confianca_discordia_entre_modelos"}]),
            ],
        },
        {
            "title": "Alertas",
            "path": "alertas",
            "icon": "mdi:alert-outline",
            "cards": [
                _card(type="custom:mw-leticia-weather-card", entity=TEMPO, layout="alerta"),
                _card(type="entities", title="Riscos vigiados", entities=[
                    "binary_sensor.tempo_aguas_claras_clima_seco",
                    "binary_sensor.tempo_aguas_claras_calor",
                    "binary_sensor.tempo_aguas_claras_frio",
                    "binary_sensor.tempo_aguas_claras_chuva_forte",
                    "binary_sensor.tempo_aguas_claras_tempestade",
                    "binary_sensor.tempo_aguas_claras_vento_forte",
                    "binary_sensor.tempo_aguas_claras_radiacao_uv",
                ]),
                _card(type="entities", title="Ar", entities=[
                    f"{PREFIXO}_qualidade_do_ar", f"{PREFIXO}_pm2_5", f"{PREFIXO}_indice_uv",
                ]),
            ],
        },
    ]


def main() -> int:
    seco = "--dry-run" in sys.argv
    # `HAClient` só conecta dentro do `with` — fora dele, `self.ws` é None e o
    # primeiro comando morre com AttributeError sem dizer por quê.
    with HAClient() as ha:
        return _rodar(ha, seco)


def _rodar(ha, seco: bool) -> int:
    existentes = {d["url_path"]: d for d in ha.cmd("lovelace/dashboards/list")}
    if URL_PATH not in existentes:
        print(f"· criando o dashboard {URL_PATH}")
        if not seco:
            ha.cmd("lovelace/dashboards/create", url_path=URL_PATH, title=TITULO,
                   icon="mdi:weather-partly-rainy", show_in_sidebar=True,
                   require_admin=False)
    else:
        print(f"· {URL_PATH} já existe")

    # Backup ANTES de escrever: a leitura é o rollback (regra da casa).
    try:
        atual = ha.cmd("lovelace/config", url_path=URL_PATH)
        Path("docs").mkdir(exist_ok=True)
        Path(f"docs/backup-{URL_PATH}.json").write_text(
            json.dumps(atual, ensure_ascii=False, indent=2)
        )
        print("· backup da configuração atual em docs/")
    except Exception:
        print("· sem configuração anterior (dashboard novo)")

    config = {"views": views()}
    if seco:
        print(json.dumps(config, ensure_ascii=False)[:400])
        return 0
    ha.cmd("lovelace/config/save", url_path=URL_PATH, config=config)

    # Releitura: deploy só existe se foi verificado NO DESTINO (regra 30).
    de_volta = ha.cmd("lovelace/config", url_path=URL_PATH)
    abas = [v["title"] for v in de_volta["views"]]
    tipos = sorted({c["type"] for v in de_volta["views"] for c in v["cards"]})
    print(f"· VERIFICADO: {len(abas)} abas {abas}")
    print(f"  tipos de card no destino: {tipos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
