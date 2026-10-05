import { Link } from "react-router-dom";
import { Ticket, Compass } from "lucide-react";
import styles from "./ReservationsEmptyState.module.css";


export default function ReservationsEmptyState({ tab = "all" }) {
  const messages = {
    all: {
      title: <>Aucune <em className={styles.titleEm}>réservation</em></>,
      desc: "Vous n'avez pas encore réservé d'événement. Découvrez les meilleurs événements près de chez vous !",
      btnLabel: "Découvrir des événements",
      btnTo: "/discover",
    },
    upcoming: {
      title: <>Aucun événement <em className={styles.titleEm}>à venir</em></>,
      desc: "Vous n'avez aucun événement programmé. C'est le moment de planifier votre prochaine sortie !",
      btnLabel: "Explorer",
      btnTo: "/discover",
    },
    past: {
      title: <>Aucun événement <em className={styles.titleEm}>passé</em></>,
      desc: "Vos événements passés apparaîtront ici une fois que vous aurez participé à des sorties.",
      btnLabel: "Découvrir des événements",
      btnTo: "/discover",
    },
    cancelled: {
      title: <>Aucune <em className={styles.titleEm}>annulation</em></>,
      desc: "Vous n'avez jamais annulé de réservation. Tant mieux !",
      btnLabel: "Voir mes réservations",
      btnTo: "/my-reservations",
    },
  };

  const msg = messages[tab] || messages.all;

  return (
    <div className={styles.empty}>
      <div className={styles.iconWrapper}>
        <Ticket size={36} />
      </div>
      <h2 className={styles.title}>{msg.title}</h2>
      <p className={styles.desc}>{msg.desc}</p>
      <Link to={msg.btnTo} className={styles.btn}>
        <Compass size={14} />
        {msg.btnLabel}
      </Link>
    </div>
  );
}