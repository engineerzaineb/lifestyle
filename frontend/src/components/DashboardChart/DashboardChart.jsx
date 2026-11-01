import { useMemo, useState } from "react";
import styles from "./DashboardChart.module.css";

/**
 * Graphique d'évolution (vues + inscriptions) en SVG pur, sans dépendance.
 * @param {Array} serie - [{ date: "2026-10-19", vues: 5, inscriptions: 1 }, ...]
 */
export default function DashboardChart({ serie = [] }) {
  const [hover, setHover] = useState(null);

  // Dimensions internes du SVG (viewBox) ; le CSS le rend responsive.
  const W = 720;
  const H = 240;
  const PAD = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const { pathVues, pathInscr, points, maxY, ticksX } = useMemo(() => {
    if (!serie.length) {
      return { pathVues: "", pathInscr: "", points: [], maxY: 0, ticksX: [] };
    }

    const maxVal = Math.max(
      1,
      ...serie.map((d) => Math.max(d.vues || 0, d.inscriptions || 0))
    );

    const x = (i) =>
      PAD.left + (serie.length === 1 ? innerW / 2 : (i / (serie.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - (v / maxVal) * innerH;

    const toPath = (key) =>
      serie
        .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key] || 0)}`)
        .join(" ");

    const pts = serie.map((d, i) => ({
      i,
      cx: x(i),
      cyVues: y(d.vues || 0),
      cyInscr: y(d.inscriptions || 0),
      ...d,
    }));

    // Étiquettes de l'axe X : on en montre ~5 pour ne pas surcharger.
    const step = Math.max(1, Math.round(serie.length / 5));
    const tx = serie
      .map((d, i) => ({ i, cx: x(i), label: formatShort(d.date) }))
      .filter((_, i) => i % step === 0 || i === serie.length - 1);

    return { pathVues: toPath("vues"), pathInscr: toPath("inscriptions"), points: pts, maxY: maxVal, ticksX: tx };
  }, [serie, innerW, innerH]);

  if (!serie.length) {
    return (
      <div className={styles.card}>
        <p className={styles.empty}>Pas encore de données à afficher.</p>
      </div>
    );
  }

  // Lignes horizontales de repère (0, milieu, max)
  const yGrid = [0, 0.5, 1].map((r) => ({
    val: Math.round(maxY * r),
    cy: PAD.top + innerH - r * innerH,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Évolution</h3>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotVues}`} /> Vues
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotInscr}`} /> Inscriptions
          </span>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none">
          {/* Grille + labels Y */}
          {yGrid.map((g, k) => (
            <g key={k}>
              <line
                x1={PAD.left}
                y1={g.cy}
                x2={W - PAD.right}
                y2={g.cy}
                className={styles.grid}
              />
              <text x={PAD.left - 8} y={g.cy + 3} className={styles.axisLabel} textAnchor="end">
                {g.val}
              </text>
            </g>
          ))}

          {/* Labels X */}
          {ticksX.map((t) => (
            <text
              key={t.i}
              x={t.cx}
              y={H - 8}
              className={styles.axisLabel}
              textAnchor="middle"
            >
              {t.label}
            </text>
          ))}

          {/* Courbes */}
          <path d={pathVues} className={styles.lineVues} fill="none" />
          <path d={pathInscr} className={styles.lineInscr} fill="none" />

          {/* Points + zone de survol */}
          {points.map((p) => (
            <g key={p.i}>
              <circle cx={p.cx} cy={p.cyVues} r={hover === p.i ? 4 : 2.5} className={styles.ptVues} />
              <circle cx={p.cx} cy={p.cyInscr} r={hover === p.i ? 4 : 2.5} className={styles.ptInscr} />
              <rect
                x={p.cx - 8}
                y={PAD.top}
                width={16}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(p.i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hover !== null && points[hover] && (
          <div
            className={styles.tooltip}
            style={{ left: `${(points[hover].cx / W) * 100}%` }}
          >
            <p className={styles.tooltipDate}>{formatLong(points[hover].date)}</p>
            <p><span className={`${styles.dot} ${styles.dotVues}`} /> {points[hover].vues} vues</p>
            <p><span className={`${styles.dot} ${styles.dotInscr}`} /> {points[hover].inscriptions} inscriptions</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatLong(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
}