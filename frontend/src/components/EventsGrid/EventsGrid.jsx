import { Link } from "react-router-dom";
import { Search, Compass } from "lucide-react";
import EventCard from "../EventCard/EventCard";
import styles from "./EventsGrid.module.css";


export default function EventsGrid({
  events = [],
  variant = "default",
  columns = "auto",
  loading = false,
  emptyTitle = "Aucun événement",
  emptyMessage = "Il n'y a aucun événement à afficher pour le moment.",
  emptyActionLabel = "Découvrir des événements",
  emptyActionTo = "/discover",
  skeletonCount = 6,
  onUnfavorite,
}) {

  // ÉTAT LOADING — afficher des skeletons
  if (loading) {
    const skeletons = Array.from({ length: skeletonCount }, (_, i) => i);

    if (variant === "horizontal") {
      return (
        <div className={styles.list}>
          {skeletons.map((i) => <SkeletonHorizontal key={i} />)}
        </div>
      );
    }

    if (variant === "compact") {
      return (
        <div className={styles.compactList}>
          {skeletons.map((i) => <SkeletonCompact key={i} />)}
        </div>
      );
    }

    return (
      <div className={`${styles.grid} ${getColumnsClass(columns)}`}>
        {skeletons.map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // ÉTAT VIDE
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <Search size={28} />
        </div>
        <h3 className={styles.emptyTitle}>{emptyTitle}</h3>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
        {emptyActionTo && (
          <Link to={emptyActionTo} className={styles.emptyAction}>
            <Compass size={14} />
            {emptyActionLabel}
          </Link>
        )}
      </div>
    );
  }

  // VARIANTE HORIZONTAL — liste verticale de cartes horizontales
  if (variant === "horizontal") {
    return (
      <div className={styles.list}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} variant="horizontal" />
        ))}
      </div>
    );
  }

  // VARIANTE COMPACT — sidebar / recommandations
  if (variant === "compact") {
    return (
      <div className={styles.compactList}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} variant="compact" />
        ))}
      </div>
    );
  }

  // VARIANTE DEFAULT — grille verticale
  return (
    <div className={`${styles.grid} ${getColumnsClass(columns)}`}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {events.map((event) => (
        <EventCard key={event.id} event={event} onUnfavorite={onUnfavorite} />
      ))}
    </div>
  );
}


function getColumnsClass(columns) {
  if (columns === 2) return styles.grid2;
  if (columns === 3) return styles.grid3;
  if (columns === 4) return styles.grid4;
  return styles.gridAuto;
}

//SKELETON CARD — carte pendant le chargement
   
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonCover} />
      <div className={styles.skeletonContent}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineMid}`} />
      </div>
    </div>
  );
}

function SkeletonHorizontal() {
  return (
    <div
      className={styles.skeleton}
      style={{ display: "flex", flexDirection: "row" }}
    >
      <div
        className={styles.skeletonCover}
        style={{ width: 240, height: 180, flexShrink: 0 }}
      />
      <div className={styles.skeletonContent} style={{ flex: 1 }}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineMid}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      </div>
    </div>
  );
}

function SkeletonCompact() {
  return (
    <div
      className={styles.skeleton}
      style={{
        display: "flex",
        gap: 10,
        padding: 10,
        alignItems: "center",
        height: 70,
      }}
    >
      <div
        className={styles.skeletonCover}
        style={{
          width: 50,
          height: 50,
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineMid}`} />
      </div>
    </div>
  );
}