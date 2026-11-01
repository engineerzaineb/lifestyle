import { Download } from "lucide-react";
import styles from "./EventStatsTable.module.css";

/**
 * Tableau récapitulatif des stats par événement + export CSV.
 * @param {Array} rows - [{ id, titre, statut, vues, inscriptions, capacite, revenue, remplissage, conversion }]
 */
export default function EventStatsTable({ rows = [] }) {
  const exportCSV = () => {
    const header = [
      "Titre", "Statut", "Vues", "Inscriptions", "Capacité",
      "Revenus (DT)", "Remplissage (%)", "Conversion (%)",
    ];
    const lines = rows.map((r) => [
      `"${r.titre.replace(/"/g, '""')}"`,
      r.statut,
      r.vues,
      r.inscriptions,
      r.capacite,
      r.revenue,
      r.remplissage,
      r.conversion,
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    // BOM pour qu'Excel lise bien les accents
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stats-evenements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows.length) {
    return (
      <div className={styles.card}>
        <p className={styles.empty}>Aucun événement à analyser pour le moment.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Performance par événement</h3>
        <button type="button" className={styles.exportBtn} onClick={exportCSV}>
          <Download size={13} />
          Exporter (CSV)
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Événement</th>
              <th>Vues</th>
              <th>Inscrits</th>
              <th>Revenus</th>
              <th>Remplissage</th>
              <th>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.titleCell}>
                  <span className={styles.eventTitle}>{r.titre}</span>
                  <span className={`${styles.badge} ${styles[`badge_${r.statut}`] || ""}`}>
                    {statutLabel(r.statut)}
                  </span>
                </td>
                <td>{r.vues}</td>
                <td>{r.inscriptions} / {r.capacite}</td>
                <td>{r.revenue.toLocaleString("fr-FR")} DT</td>
                <td>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${Math.min(r.remplissage, 100)}%` }} />
                  </div>
                  <span className={styles.barLabel}>{r.remplissage}%</span>
                </td>
                <td>{r.conversion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statutLabel(s) {
  return {
    publie: "Publié",
    en_attente: "En attente",
    brouillon: "Brouillon",
    refuse: "Refusé",
    annule: "Annulé",
    termine: "Terminé",
  }[s] || s;
}