/* ============================================
   Spark ERP — Connectivity & Health Monitor
   Page Visibility API stops polling when tab is
   hidden. 60s interval (down from 30s).
   Exponential backoff on repeated failures.
   ============================================ */

import { api } from "../modules/api.js";

class ConnectivityMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isServerReachable = false;
    this.checkTimer = null;
    this.listeners = [];
    this._failCount = 0;
    this._BASE_INTERVAL = 60000; /* 60 seconds */
    this._MAX_INTERVAL = 300000; /* 5 minutes cap */
  }

  init() {
    window.addEventListener("online",  () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));

    /* Pause health checks when tab is in background to save bandwidth */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this._stopTimer();
      } else {
        /* Tab became visible — check immediately then restart timer */
        this.checkHealth();
        this._startTimer();
      }
    });

    this.checkHealth();
    this._startTimer();
  }

  _stopTimer() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  _startTimer() {
    this._stopTimer();
    /* Use exponential backoff when server repeatedly unreachable */
    const interval = Math.min(
      this._BASE_INTERVAL * Math.pow(1.5, Math.min(this._failCount, 4)),
      this._MAX_INTERVAL
    );
    this.checkTimer = setInterval(() => {
      if (!document.hidden) this.checkHealth();
    }, interval);
  }

  async checkHealth() {
    if (!navigator.onLine) {
      this.isServerReachable = false;
      this.notify();
      return false;
    }

    try {
      const res = await api.health();
      const reachable = res && res.status === "ok";
      const wasUnreachable = !this.isServerReachable;
      this.isServerReachable = reachable;

      if (reachable) {
        this._failCount = 0;
        this._startTimer(); /* Reset to base interval on success */

        /* Reconnection event — let SyncEngine know */
        if (wasUnreachable) {
          window.dispatchEvent(new CustomEvent("spark:reconnected"));
        }
      } else {
        this._failCount++;
        this._startTimer(); /* Restart with backoff interval */
      }
    } catch {
      this.isServerReachable = false;
      this._failCount++;
      this._startTimer();
    }

    this.notify();
    return this.isServerReachable;
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    if (online) {
      this._failCount = 0;
      this.checkHealth();
    } else {
      this.isServerReachable = false;
      this._stopTimer();
      this.notify();
    }
  }

  onChange(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  notify() {
    const status = {
      isOnline: this.isOnline,
      isServerReachable: this.isServerReachable,
    };
    for (const listener of this.listeners) listener(status);
    window.dispatchEvent(new CustomEvent("spark:connectivity-changed", { detail: status }));
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
