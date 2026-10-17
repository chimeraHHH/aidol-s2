#!/usr/bin/env python3
"""Generate simulated kitten weight Excel + JSON for the health dashboard."""

from __future__ import annotations

import json
import math
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = ROOT / "app" / "public" / "data" / "kitten-weight-sim.xlsx"
JSON_PATH = ROOT / "app" / "src" / "features" / "trends" / "data" / "kittenWeightSim.json"

BIRTHDAY = date(2024, 3, 12)
# Pin "today" for reproducible demo aligned with app seed era
TODAY = date(2026, 10, 17)
IDEAL_MIN = 4.2
IDEAL_MAX = 4.6
ADULT_TARGET = 4.42
CAT_NAME = "咪酱"
BREED = "英短蓝猫"

random.seed(42)


def weight_at(day_index: int) -> float:
    """Logistic growth from ~0.95 kg newborn toward adult, with daily noise."""
    age_months = day_index / 30.437
    # newborn ~0.95 → adult ~4.42
    base = 0.95 + (ADULT_TARGET - 0.95) * (1 - math.exp(-age_months / 5.8))
    seasonal = 0.028 * math.sin(day_index / 45.0) + 0.018 * math.cos(day_index / 17.0)
    noise = random.gauss(0, 0.012)
    # occasional bigger wobble (overeating / illness recovery)
    if random.random() < 0.04:
        noise += random.choice([-1, 1]) * random.uniform(0.04, 0.09)
    return round(max(0.8, base + seasonal + noise), 2)


def build_daily_rows() -> list[dict]:
    rows: list[dict] = []
    d = BIRTHDAY
    prev: float | None = None
    idx = 0
    while d <= TODAY:
        # denser records after 6 months; near-daily in last 90 days
        age_days = (d - BIRTHDAY).days
        if age_days <= 60:
            step = 3
        elif age_days <= 180:
            step = 2
        elif (TODAY - d).days <= 90:
            step = 1
        else:
            step = 2

        w = weight_at(age_days)
        delta = None if prev is None else round(w - prev, 2)
        in_ideal = IDEAL_MIN <= w <= IDEAL_MAX
        rows.append(
            {
                "date": d.isoformat(),
                "weekday": "一二三四五六日"[d.weekday()],
                "age_days": age_days,
                "age_months": round(age_days / 30.437, 1),
                "weight_kg": w,
                "delta_kg": delta,
                "in_ideal": in_ideal,
                "note": note_for(w, delta, age_days),
            }
        )
        prev = w
        d += timedelta(days=step)
        idx += 1
    return rows


def note_for(w: float, delta: float | None, age_days: int) -> str:
    if age_days < 120:
        return "生长期"
    if delta is not None and abs(delta) >= 0.08:
        return "波动偏大" if abs(delta) >= 0.12 else "轻波动"
    if w < IDEAL_MIN:
        return "低于理想区间"
    if w > IDEAL_MAX:
        return "高于理想区间"
    return "理想区间内"


def aggregate_month(rows: list[dict]) -> list[dict]:
    buckets: dict[str, list[float]] = {}
    for r in rows:
        key = r["date"][:7]
        buckets.setdefault(key, []).append(r["weight_kg"])
    out = []
    prev_avg = None
    for key in sorted(buckets):
        vals = buckets[key]
        avg = round(sum(vals) / len(vals), 2)
        delta = None if prev_avg is None else round(avg - prev_avg, 2)
        out.append(
            {
                "month": key,
                "avg_kg": avg,
                "min_kg": min(vals),
                "max_kg": max(vals),
                "count": len(vals),
                "delta_kg": delta,
                "in_ideal_ratio": round(
                    sum(1 for v in vals if IDEAL_MIN <= v <= IDEAL_MAX) / len(vals), 2
                ),
            }
        )
        prev_avg = avg
    return out


def aggregate_year(rows: list[dict]) -> list[dict]:
    buckets: dict[str, list[float]] = {}
    for r in rows:
        key = r["date"][:4]
        buckets.setdefault(key, []).append(r["weight_kg"])
    out = []
    prev_avg = None
    for key in sorted(buckets):
        vals = buckets[key]
        avg = round(sum(vals) / len(vals), 2)
        delta = None if prev_avg is None else round(avg - prev_avg, 2)
        out.append(
            {
                "year": key,
                "avg_kg": avg,
                "min_kg": min(vals),
                "max_kg": max(vals),
                "count": len(vals),
                "delta_kg": delta,
                "growth_kg": round(max(vals) - min(vals), 2),
            }
        )
        prev_avg = avg
    return out


def analyze(rows: list[dict], months: list[dict], years: list[dict]) -> dict:
    latest = rows[-1]
    last14 = rows[-14:] if len(rows) >= 14 else rows
    last30 = rows[-30:] if len(rows) >= 30 else rows
    weights = [r["weight_kg"] for r in rows]
    deltas = [r["delta_kg"] for r in rows if r["delta_kg"] is not None]

    def avg(xs: list[float]) -> float:
        return round(sum(xs) / len(xs), 2) if xs else 0.0

    week_delta = round(last14[-1]["weight_kg"] - last14[0]["weight_kg"], 2)
    month_delta = round(last30[-1]["weight_kg"] - last30[0]["weight_kg"], 2)
    adult_rows = [r for r in rows if r["age_days"] >= 365]
    adult_in_ideal = (
        round(
            sum(1 for r in adult_rows if r["in_ideal"]) / len(adult_rows),
            2,
        )
        if adult_rows
        else None
    )

    volatility = round(
        (sum(abs(d) for d in deltas[-60:]) / max(1, len(deltas[-60:]))),
        3,
    )

    if week_delta >= 0.06:
        insight = f"{CAT_NAME}近两周体重略升 {week_delta:.2f} kg，建议多陪玩、留意进食量。"
    elif week_delta <= -0.06:
        insight = f"{CAT_NAME}近两周体重略降 {abs(week_delta):.2f} kg，可观察食欲与精神状态。"
    elif adult_in_ideal and adult_in_ideal >= 0.8:
        insight = f"{CAT_NAME}成年后多数时间落在理想区间，节奏稳定，继续温柔陪伴即可。"
    else:
        insight = f"{CAT_NAME}整体状态平稳，当前 {latest['weight_kg']:.2f} kg。"

    # health score 55–95
    score = 72
    if latest["in_ideal"]:
        score += 12
    if abs(week_delta) < 0.05:
        score += 8
    elif abs(week_delta) < 0.1:
        score += 3
    else:
        score -= 6
    if volatility < 0.025:
        score += 6
    elif volatility > 0.05:
        score -= 5
    score = max(55, min(96, score))

    grade = "优秀" if score >= 88 else "良好" if score >= 75 else "关注"

    return {
        "catName": CAT_NAME,
        "breed": BREED,
        "birthday": BIRTHDAY.isoformat(),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "idealRange": {"min": IDEAL_MIN, "max": IDEAL_MAX},
        "latest": {
            "date": latest["date"],
            "weightKg": latest["weight_kg"],
            "deltaKg": latest["delta_kg"],
            "inIdeal": latest["in_ideal"],
        },
        "stats": {
            "totalRecords": len(rows),
            "avgAllKg": avg(weights),
            "avg14dKg": avg([r["weight_kg"] for r in last14]),
            "avg30dKg": avg([r["weight_kg"] for r in last30]),
            "minKg": min(weights),
            "maxKg": max(weights),
            "weekDeltaKg": week_delta,
            "monthDeltaKg": month_delta,
            "volatility60d": volatility,
            "adultInIdealRatio": adult_in_ideal,
            "monthBuckets": len(months),
            "yearBuckets": len(years),
        },
        "score": score,
        "grade": grade,
        "insight": insight,
        "highlights": [
            f"共 {len(rows)} 条称重记录，跨 {years[0]['year']}-{years[-1]['year']} 年",
            f"当前体重 {latest['weight_kg']:.2f} kg，{'在理想区间' if latest['in_ideal'] else '偏离理想区间'}",
            f"近14日均重 {avg([r['weight_kg'] for r in last14]):.2f} kg，变化 {week_delta:+.2f} kg",
            f"近60日日均波动 {volatility:.3f} kg",
            (
                f"成年后理想区间占比 {adult_in_ideal:.0%}"
                if adult_in_ideal is not None
                else "尚在生长期"
            ),
        ],
    }


def style_header(ws, cols: int) -> None:
    fill = PatternFill("solid", fgColor="C4784A")
    font = Font(color="FFFFFF", bold=True)
    thin = Border(
        left=Side(style="thin", color="E8DFD0"),
        right=Side(style="thin", color="E8DFD0"),
        top=Side(style="thin", color="E8DFD0"),
        bottom=Side(style="thin", color="E8DFD0"),
    )
    for c in range(1, cols + 1):
        cell = ws.cell(1, c)
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin


def autosize(ws) -> None:
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        width = max(len(str(c.value)) if c.value is not None else 0 for c in col)
        ws.column_dimensions[letter].width = min(28, max(10, width + 2))


def write_excel(rows: list[dict], months: list[dict], years: list[dict], analysis: dict) -> None:
    wb = Workbook()

    # Sheet 1 raw
    ws = wb.active
    ws.title = "原始称重"
    headers = ["日期", "星期", "日龄", "月龄", "体重kg", "较上次kg", "是否理想区间", "备注"]
    ws.append(headers)
    for r in rows:
        ws.append(
            [
                r["date"],
                r["weekday"],
                r["age_days"],
                r["age_months"],
                r["weight_kg"],
                r["delta_kg"] if r["delta_kg"] is not None else "",
                "是" if r["in_ideal"] else "否",
                r["note"],
            ]
        )
    style_header(ws, len(headers))
    autosize(ws)

    # Sheet 2 month
    wm = wb.create_sheet("月汇总")
    mh = ["月份", "月均kg", "最低kg", "最高kg", "称重次数", "较上月kg", "理想占比"]
    wm.append(mh)
    for m in months:
        wm.append(
            [
                m["month"],
                m["avg_kg"],
                m["min_kg"],
                m["max_kg"],
                m["count"],
                m["delta_kg"] if m["delta_kg"] is not None else "",
                m["in_ideal_ratio"],
            ]
        )
    style_header(wm, len(mh))
    autosize(wm)

    # Sheet 3 year
    wy = wb.create_sheet("年汇总")
    yh = ["年份", "年均kg", "最低kg", "最高kg", "称重次数", "较上年kg", "年内振幅kg"]
    wy.append(yh)
    for y in years:
        wy.append(
            [
                y["year"],
                y["avg_kg"],
                y["min_kg"],
                y["max_kg"],
                y["count"],
                y["delta_kg"] if y["delta_kg"] is not None else "",
                y["growth_kg"],
            ]
        )
    style_header(wy, len(yh))
    autosize(wy)

    # Sheet 4 analysis
    wa = wb.create_sheet("分析摘要")
    wa.append(["字段", "值"])
    style_header(wa, 2)
    pairs = [
        ("猫咪", analysis["catName"]),
        ("品种", analysis["breed"]),
        ("生日", analysis["birthday"]),
        ("生成时间", analysis["generatedAt"]),
        ("理想区间kg", f"{IDEAL_MIN}-{IDEAL_MAX}"),
        ("健康评分", analysis["score"]),
        ("评级", analysis["grade"]),
        ("洞察", analysis["insight"]),
        ("总记录数", analysis["stats"]["totalRecords"]),
        ("全程均重kg", analysis["stats"]["avgAllKg"]),
        ("近14日均kg", analysis["stats"]["avg14dKg"]),
        ("近30日均kg", analysis["stats"]["avg30dKg"]),
        ("历史最低kg", analysis["stats"]["minKg"]),
        ("历史最高kg", analysis["stats"]["maxKg"]),
        ("近14日变化kg", analysis["stats"]["weekDeltaKg"]),
        ("近30日变化kg", analysis["stats"]["monthDeltaKg"]),
        ("近60日波动", analysis["stats"]["volatility60d"]),
        ("成年理想占比", analysis["stats"]["adultInIdealRatio"]),
    ]
    for k, v in pairs:
        wa.append([k, v])
    for i, h in enumerate(analysis["highlights"], 1):
        wa.append([f"要点{i}", h])
    autosize(wa)

    XLSX_PATH.parent.mkdir(parents=True, exist_ok=True)
    wb.save(XLSX_PATH)


def write_json(rows: list[dict], months: list[dict], years: list[dict], analysis: dict) -> None:
    measurements = []
    for i, r in enumerate(rows):
        # newest-first for app list
        measurements.append(
            {
                "sessionId": f"sim-{r['date']}",
                "weightKg": r["weight_kg"],
                "deltaKg": r["delta_kg"],
                "lockedAt": f"{r['date']}T10:00:00.000Z",
                "source": "mock",
            }
        )
    measurements.reverse()

    payload = {
        "meta": {
            "sourceFile": "kitten-weight-sim.xlsx",
            "catName": CAT_NAME,
            "breed": BREED,
            "birthday": BIRTHDAY.isoformat(),
            "idealRange": {"min": IDEAL_MIN, "max": IDEAL_MAX},
        },
        "analysis": analysis,
        "daily": [
            {
                "date": r["date"],
                "weightKg": r["weight_kg"],
                "deltaKg": r["delta_kg"],
                "label": f"{int(r['date'][5:7])}/{int(r['date'][8:10])}",
                "title": f"{int(r['date'][5:7])}月{int(r['date'][8:10])}日 · 周{r['weekday']}",
                "inIdeal": r["in_ideal"],
                "note": r["note"],
                "count": 1,
            }
            for r in rows
        ],
        "monthly": [
            {
                "date": m["month"],
                "weightKg": m["avg_kg"],
                "deltaKg": m["delta_kg"],
                "label": f"{int(m['month'][5:7])}月",
                "title": f"{m['month'][:4]}年{int(m['month'][5:7])}月",
                "count": m["count"],
                "minKg": m["min_kg"],
                "maxKg": m["max_kg"],
                "inIdealRatio": m["in_ideal_ratio"],
            }
            for m in months
        ],
        "yearly": [
            {
                "date": y["year"],
                "weightKg": y["avg_kg"],
                "deltaKg": y["delta_kg"],
                "label": f"{y['year']}年",
                "title": f"{y['year']}年",
                "count": y["count"],
                "minKg": y["min_kg"],
                "maxKg": y["max_kg"],
                "growthKg": y["growth_kg"],
            }
            for y in years
        ],
        "measurements": measurements,
    }
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    rows = build_daily_rows()
    months = aggregate_month(rows)
    years = aggregate_year(rows)
    analysis = analyze(rows, months, years)
    write_excel(rows, months, years, analysis)
    write_json(rows, months, years, analysis)
    print(f"Excel → {XLSX_PATH}")
    print(f"JSON  → {JSON_PATH}")
    print(f"records={len(rows)} months={len(months)} years={len(years)} score={analysis['score']}")


if __name__ == "__main__":
    main()
