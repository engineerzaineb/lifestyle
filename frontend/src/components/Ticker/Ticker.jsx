import { Flame, Zap } from "lucide-react";
import styles from "./Ticker.module.css";


export default function Ticker({ items }) {
  const defaultItems = [
    { type: "text", emoji: "🎷", text: "Soirée Jazz au Carthage" },
    { type: "deal", text: "-40% Festival Hammamet" },
    { type: "text", emoji: "🍽️", text: "Brunch Sidi Bou Saïd" },
    { type: "hot", text: "Stand-up Théâtre Municipal" },
    { type: "text", emoji: "🎨", text: "Vernissage Galerie Selma" },
    { type: "deal", text: "-25% Brunch dominical" },
    { type: "text", emoji: "🏃", text: "Marathon de la Médina" },
    { type: "text", emoji: "🍷", text: "Dégustation vins naturels" },
    { type: "hot", text: "Concert Café Journal" },
    { type: "text", emoji: "🎭", text: "Spectacle d'humour Carthage" },
  ];

  const list = items || defaultItems;
  const doubled = [...list, ...list];

  return (
    <div className={styles.ticker}>
      <div className={styles.track}>
        {doubled.map((item, i) => (
          <TickerItem key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ item, index }) {
  // décalage d'animation différent pour chaque emoji 
  const animationDelay = `${(index % 5) * 0.3}s`;

  // badge deal
  if (item.type === "deal") {
    return (
      <>
        <span className={styles.dealItem}>
          <span className={styles.dealIcon}>
            <Zap size={11} fill="white" />
          </span>
          {item.text}
        </span>
        <span className={styles.separator}>•</span>
      </>
    );
  }

  //badge hot
  if (item.type === "hot") {
    return (
      <>
        <span className={styles.hotItem}>
          <span className={styles.hotIcon}>
            <Flame size={11} fill="white" />
          </span>
          {item.text}
        </span>
        <span className={styles.separator}>•</span>
      </>
    );
  }

  //item texte avec emoji qui bobs
  return (
    <>
      <span className={styles.item}>
        {item.emoji && (
          <span
            className={styles.itemEmoji}
            style={{ animationDelay }}
          >
            {item.emoji}
          </span>
        )}
        {item.text}
      </span>
      <span className={styles.separator}>•</span>
    </>
  );
}