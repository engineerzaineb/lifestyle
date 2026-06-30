import { STATUS_TABS } from "../../../services/organizerService";
import styles from "./OrganizerTabs.module.css";


export default function OrganizerTabs({ currentTab, counts = {}, onChange }) {
  return (
    <div className={styles.tabs}>
      {STATUS_TABS.map((tab) => {
        const isActive = currentTab === tab.id;
        const count = counts[tab.id] || 0;
        const dotClass = tab.color
          ? styles[`dot${tab.color.charAt(0).toUpperCase()}${tab.color.slice(1)}`]
          : null;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
          >
            {dotClass && <span className={`${styles.dot} ${dotClass}`} />}
            {tab.label}
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}