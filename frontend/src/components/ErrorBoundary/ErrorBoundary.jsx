import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import styles from "./ErrorBoundary.module.css";


export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // En production, on enverrait à Sentry ou autre service
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorPage}>
          <div className={styles.container}>
            <div className={styles.icon}>
              <AlertTriangle size={36} />
            </div>
            <h1 className={styles.title}>Oups, une erreur est survenue</h1>
            <p className={styles.message}>
              Quelque chose s'est mal passé. Pas d'inquiétude, rien n'est perdu.
              Essayez de recharger la page.
            </p>

            {this.state.error && (
              <div className={styles.details}>
                {this.state.error.toString()}
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={this.handleReload} className={`${styles.btn} ${styles.btnPrimary}`}>
                <RefreshCw size={14} />
                Recharger
              </button>
              <button onClick={this.handleHome} className={`${styles.btn} ${styles.btnSecondary}`}>
                <Home size={14} />
                Accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}