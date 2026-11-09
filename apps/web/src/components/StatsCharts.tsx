import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { useLanguage } from "../lib/i18n";

/**
 * 07/11 #66–#91 istatistik grafikleri: dönem çizgi grafiği, açılır başlıklı pasta, kaynak halka grafiği,
 * huni, gün × saat yoğunluk haritası ve dönem filtreli listeler. Tüm grafikler yalnız gerçek ölçümleri çizer.
 */

export const chartColors = ["#6366f1", "#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#a78bfa", "#ec4899", "#14b8a6", "#84cc16", "#64748b"];
export const sentimentColors = { like: "#3b82f6", ok: "#8b5cf6", dislike: "#f97316" } as const;

const fmt = (value: number, language: "tr" | "en", digits = 1) => value.toLocaleString(language === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: digits });
const percent = (value: number, total: number) => total > 0 ? value / total * 100 : 0;

export function ChartPanel({ title, description, actions, children, className = "" }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`stats-panel stats-chart-panel ${className}`}>
    <header className="stats-chart-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions ? <div className="stats-chart-actions">{actions}</div> : null}</header>
    {children}
  </section>;
}

export function SegmentTabs<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: ReactNode; tone?: string }>; onChange: (value: T) => void; label: string }) {
  return <div aria-label={label} className="stats-segment" role="tablist">{options.map((option) => <button aria-selected={value === option.value} className={value === option.value ? "active" : ""} data-tone={option.tone} key={option.value} onClick={() => onChange(option.value)} role="tab" type="button">{option.label}</button>)}</div>;
}

/** Başlığı açılır menü olan panel (ör. "Yaş dağılımı ▾"). */
export function TitleSelect<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void; label: string }) {
  return <label className="stats-title-select"><span className="sr-only">{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value as T)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export type PeriodSeries = { key: string; label: string; color: string; values: Record<string, number | undefined> };

/** #66, #80, #85: dönem sekmeleri + özet kutuları + dönemler boyunca çizgi grafik; nokta üzerine gelince tüm serilerin değeri. */
export function PeriodTotalsChart({ periods, series, note }: { periods: Array<{ key: string; label: string }>; series: PeriodSeries[]; note?: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const visiblePeriods = periods.filter((period) => series.some((item) => item.values[period.key] !== undefined));
  const [selected, setSelected] = useState(visiblePeriods[0]?.key ?? "");
  const [hover, setHover] = useState<number | null>(null);
  if (!visiblePeriods.length || !series.length) return null;
  const active = visiblePeriods.some((period) => period.key === selected) ? selected : visiblePeriods[0]!.key;
  const max = Math.max(1, ...series.flatMap((item) => visiblePeriods.map((period) => item.values[period.key] ?? 0)));
  const niceMax = niceCeiling(max);
  const width = 640; const height = 240; const left = 40; const right = 16; const top = 12; const bottom = 30;
  const x = (index: number) => visiblePeriods.length === 1 ? (left + width - right) / 2 : left + index * (width - left - right) / (visiblePeriods.length - 1);
  const y = (value: number) => top + (1 - value / niceMax) * (height - top - bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(niceMax * ratio));
  return <div className="stats-period-chart">
    <SegmentTabs label={t("Dönem", "Period")} onChange={setSelected} options={visiblePeriods.map((period) => ({ value: period.key, label: period.label }))} value={active}/>
    <div className="stats-period-cards">{series.map((item) => <article key={item.key} style={{ "--tone": item.color } as CSSProperties}><span><i/>{item.label}</span><strong>{fmt(item.values[active] ?? 0, language, 0)}</strong></article>)}</div>
    <div className="stats-line-wrap">
      <svg aria-label={series.map((item) => `${item.label}: ${visiblePeriods.map((period) => `${period.label} ${item.values[period.key] ?? 0}`).join(", ")}`).join("; ")} className="stats-period-svg" onMouseLeave={() => setHover(null)} role="img" viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((tick) => <g key={tick}><line className="grid" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)}/><text className="axis" textAnchor="end" x={left - 6} y={y(tick) + 4}>{fmt(tick, language, 0)}</text></g>)}
        {visiblePeriods.map((period, index) => <text className="axis" key={period.key} textAnchor="middle" x={x(index)} y={height - 8}>{period.label}</text>)}
        {hover !== null ? <line className="guide" x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom}/> : null}
        {series.map((item) => <g key={item.key}>
          <polyline fill="none" points={visiblePeriods.map((period, index) => `${x(index)},${y(item.values[period.key] ?? 0)}`).join(" ")} stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}/>
          {visiblePeriods.map((period, index) => <circle cx={x(index)} cy={y(item.values[period.key] ?? 0)} fill={item.color} key={period.key} r={hover === index ? 5.5 : 4}/>)}
        </g>)}
        {visiblePeriods.map((period, index) => <rect fill="transparent" height={height - top - bottom + 10} key={period.key} onFocus={() => setHover(index)} onMouseEnter={() => setHover(index)} tabIndex={0} width={Math.max(24, (width - left - right) / Math.max(1, visiblePeriods.length))} x={x(index) - Math.max(24, (width - left - right) / Math.max(1, visiblePeriods.length)) / 2} y={top}/>)}
      </svg>
      {hover !== null ? <div className="stats-tooltip" role="status" style={{ left: `${x(hover) / width * 100}%` }}><strong>{visiblePeriods[hover]!.label}</strong>{series.map((item) => <span key={item.key}><i style={{ background: item.color }}/>{item.label}<b>{fmt(item.values[visiblePeriods[hover]!.key] ?? 0, language, 0)}</b></span>)}</div> : null}
    </div>
    <ul className="stats-chart-legend">{series.map((item) => <li key={item.key}><i style={{ background: item.color }}/>{item.label}</li>)}</ul>
    {note ? <p className="stats-chart-note">{note}</p> : null}
  </div>;
}

function niceCeiling(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  for (const step of [1, 2, 2.5, 5, 10]) if (value <= step * magnitude) return step * magnitude;
  return 10 * magnitude;
}

/** Pasta grafik + yüzde ve kişi sayılı açıklama listesi (#67, #71, #78, #87). */
export function PieWithLegend({ entries, unit, legendTitle, label }: { entries: Array<{ key: string; label: ReactNode; text: string; value: number }>; unit: string; legendTitle: string; label: string }) {
  const { language } = useLanguage();
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!total) return <p className="stats-empty">{language === "tr" ? "Bu dağılım için henüz veri yok." : "No data for this distribution yet."}</p>;
  let angle = -Math.PI / 2;
  const slices = entries.map((entry, index) => {
    const sweep = entry.value / total * Math.PI * 2;
    const start = angle; angle += sweep;
    return { ...entry, color: chartColors[index % chartColors.length]!, path: sweep >= Math.PI * 2 - 1e-6 ? null : arcPath(100, 100, 92, 0, start, angle) };
  });
  return <div className="stats-pie-layout">
    <svg aria-label={`${label}: ${entries.map((entry) => `${entry.text} ${Math.round(percent(entry.value, total))}%`).join(", ")}`} className="stats-pie" role="img" viewBox="0 0 200 200">
      {slices.map((slice) => slice.path ? <path d={slice.path} fill={slice.color} key={slice.key} stroke="var(--stats-surface, #fff)" strokeWidth={1.5}><title>{`${slice.text}: ${slice.value}`}</title></path> : <circle cx={100} cy={100} fill={slice.color} key={slice.key} r={92}/>)}
    </svg>
    <div className="stats-pie-legend"><h3>{legendTitle}</h3><ul>{slices.map((slice) => <li key={slice.key}><div><span><i style={{ background: slice.color }}/>{slice.label}</span><small>{fmt(slice.value, language, 0)} {unit}</small></div><strong>{fmt(percent(slice.value, total), language)}%</strong></li>)}</ul></div>
  </div>;
}

/** Kaynak/kanal halka grafiği: solda yüzde kartları, sağda ortası etiketli halka (#68, #72, #79, #88). */
export function SourceDonut({ entries, centerLabel, label }: { entries: Array<{ key: string; label: ReactNode; text: string; value: number }>; centerLabel: string; label: string }) {
  const { language } = useLanguage();
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!total) return <p className="stats-empty">{language === "tr" ? "Henüz ölçüm yok." : "No measurements yet."}</p>;
  let angle = -Math.PI / 2;
  const slices = entries.map((entry, index) => {
    const sweep = entry.value / total * Math.PI * 2;
    const start = angle; angle += sweep;
    return { ...entry, color: chartColors[index % chartColors.length]!, path: arcPath(100, 100, 94, 62, start, angle - (entries.length > 1 ? 0.012 : 0)) };
  });
  return <div className="stats-donut-layout">
    <ul className="stats-source-cards">{slices.map((slice) => <li key={slice.key}><span><i style={{ background: slice.color }}/>{slice.label}</span><strong>{fmt(percent(slice.value, total), language, 0)}%</strong><small>{fmt(slice.value, language, 0)}</small></li>)}</ul>
    <svg aria-label={`${label}: ${entries.map((entry) => `${entry.text} ${Math.round(percent(entry.value, total))}%`).join(", ")}`} className="stats-ring" role="img" viewBox="0 0 200 200">
      {slices.map((slice) => <path d={slice.path} fill={slice.color} key={slice.key}><title>{`${slice.text}: ${slice.value}`}</title></path>)}
      <text className="ring-label" textAnchor="middle" x={100} y={94}>{centerLabel}</text>
      <text className="ring-value" textAnchor="middle" x={100} y={122}>{fmt(total, language, 0)}</text>
    </svg>
  </div>;
}

function arcPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  if (end - start >= Math.PI * 2 - 1e-6) end = start + Math.PI * 2 - 1e-4;
  const large = end - start > Math.PI ? 1 : 0;
  const p = (radius: number, angle: number) => `${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`;
  if (!inner) return `M ${cx} ${cy} L ${p(outer, start)} A ${outer} ${outer} 0 ${large} 1 ${p(outer, end)} Z`;
  return `M ${p(outer, start)} A ${outer} ${outer} 0 ${large} 1 ${p(outer, end)} L ${p(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, start)} Z`;
}

/** Huni grafik (#70, #76, #77, #86): her adım bir önceki adıma göre dönüşüm oranıyla. */
export function FunnelChart({ steps }: { steps: Array<{ key: string; label: string; value: number }> }) {
  const { language } = useLanguage();
  const gradientId = useId();
  if (steps.length < 2) return null;
  const max = Math.max(1, ...steps.map((step) => step.value));
  const rowHeight = 48; const gap = 6; const funnelWidth = 440; const center = funnelWidth / 2; const minWidth = 64; const labelX = funnelWidth + 24;
  const widthFor = (value: number) => minWidth + (funnelWidth - minWidth) * (value / max);
  return <div className="stats-funnel">
    <svg aria-label={steps.map((step) => `${step.label}: ${step.value}`).join(", ")} role="img" viewBox={`0 0 ${labelX + 300} ${steps.length * (rowHeight + gap)}`}>
      <defs><linearGradient id={gradientId} x1="0" x2="1"><stop offset="0" stopColor="#1d6545"/><stop offset="1" stopColor="#38a169"/></linearGradient></defs>
      {steps.map((step, index) => {
        const topWidth = widthFor(step.value); const next = steps[index + 1]; const bottomWidth = next ? widthFor(next.value) : topWidth * 0.82;
        const y = index * (rowHeight + gap);
        const previous = steps[index - 1];
        return <g key={step.key}>
          <path d={`M ${center - topWidth / 2} ${y} L ${center + topWidth / 2} ${y} L ${center + bottomWidth / 2} ${y + rowHeight} L ${center - bottomWidth / 2} ${y + rowHeight} Z`} fill={`url(#${gradientId})`} opacity={1 - index * (0.5 / steps.length)}/>
          <text className="funnel-value" textAnchor="middle" x={center} y={y + rowHeight / 2 + 6}>{fmt(step.value, language, 0)}</text>
          <text className="funnel-label" x={labelX} y={y + rowHeight / 2 - 2}>{step.label}</text>
          <text className="funnel-rate" x={labelX} y={y + rowHeight / 2 + 16}>{previous ? `${language === "tr" ? "Önceki adıma göre" : "From previous step"}: ${fmt(percent(step.value, previous.value), language)}%` : language === "tr" ? "Başlangıç" : "Start"}</text>
        </g>;
      })}
    </svg>
  </div>;
}

const dayOrder = ["pzt", "sal", "car", "per", "cum", "cmt", "paz"] as const;
const dayLabels = { tr: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
const slots = [12, 14, 16, 18, 20, 22];

/** #81: gün × saat yoğunluk haritası (en yoğun hücre %100). */
export function DensityHeatmap({ data }: { data: Record<string, number> }) {
  const { language } = useLanguage();
  const max = Math.max(0, ...Object.values(data));
  if (!max) return <p className="stats-empty">{language === "tr" ? "Yoğunluk için henüz bilet satışı yok." : "No ticket sales for density yet."}</p>;
  const level = (value: number) => value <= 0 ? 0 : Math.min(5, Math.ceil(value / max * 5));
  return <div className="stats-heatmap">
    <div className="stats-heatmap-scale"><span>{language === "tr" ? "Düşük yoğunluk" : "Low density"}</span><span className="scale">{[1, 2, 3, 4, 5].map((step) => <i data-level={step} key={step}/>)}</span><span>{language === "tr" ? "Yüksek" : "High"}</span></div>
    <div className="stats-heatmap-grid" role="table">
      <div role="row"><span role="columnheader"/>{dayLabels[language].map((day) => <span key={day} role="columnheader">{day}</span>)}</div>
      {slots.map((slot) => <div key={slot} role="row"><span role="rowheader">{`${slot}:00`}</span>{dayOrder.map((day, index) => {
        const value = data[`density_${day}_${slot}`] ?? 0;
        const share = Math.round(value / max * 100);
        return <span data-level={level(value)} key={day} role="cell" title={`${dayLabels[language][index]} ${slot}:00 · ${fmt(value, language, 0)}`}>{value ? `${share}%` : "—"}</span>;
      })}</div>)}
    </div>
  </div>;
}

/** Dönem filtreli sıralı liste (#82, #83, #89–#91). */
export function PeriodRankedList({ periods, groups, renderLabel, valueSuffix = "" }: { periods: Array<{ key: string; label: string }>; groups: Record<string, Array<[string, number]>>; renderLabel: (key: string) => ReactNode; valueSuffix?: string }) {
  const { language } = useLanguage();
  const [period, setPeriod] = useState(periods[0]?.key ?? "");
  const rows = groups[period] ?? [];
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return <div className="stats-ranked">
    <SegmentTabs label={language === "tr" ? "Dönem" : "Period"} onChange={setPeriod} options={periods.map((item) => ({ value: item.key, label: item.label }))} value={period}/>
    {rows.length ? <div className="stats-bar-list">{rows.map(([key, value]) => <div className="stats-bar-row" key={key}><div><span>{renderLabel(key)}</span><strong>{fmt(value, language)}{valueSuffix}</strong></div><span className="stats-bar-track"><span style={{ "--bar-width": `${value / max * 100}%` } as CSSProperties}/></span></div>)}</div> : <p className="stats-empty">{language === "tr" ? "Bu dönemde veri yok." : "No data for this period."}</p>}
  </div>;
}
