import { Calendar, MapPin, Clock, Users, AlertTriangle } from "lucide-react";
import {
  getUrgencyMessage,
  getDurationMinutes,
  formatDuration,
} from "../../../services/eventDisplayService";
import { formatDate } from "../../../utils/formatters";
import styles from "./EventQuickInfo.module.css";


export default function EventQuickInfo({ event }) {
  const urgencyMsg = getUrgencyMessage(event);
  const duration = getDurationMinutes(event);

  return (
    <>
      {urgencyMsg && (
        <div className={styles.urgency}>
          <AlertTriangle size={15} />
          {urgencyMsg}
        </div>
      )}

      <div className={styles.grid}>
        <InfoCard
          icon={Calendar}
          label="Date"
          value={formatDate(event.date_evenement, { withTime: true })}
        />
        <InfoCard icon={MapPin} label="Lieu" value={event.ville} />
        {duration && (
          <InfoCard icon={Clock} label="Durée" value={formatDuration(duration)} />
        )}
        <InfoCard
          icon={Users}
          label="Places"
          value={`${event.places_restantes} / ${event.capacite_totale}`}
        />
      </div>
    </>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>
        <Icon size={16} />
      </div>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
}