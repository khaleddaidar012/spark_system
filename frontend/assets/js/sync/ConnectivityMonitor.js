/* ============================================
   Spark ERP — Connectivity & Health Monitor
   Distinguishes between browser network interface
   and Spark API server reachability.
   ============================================ */

import { api } from "../modules/api.js";

class ConnectivityMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isServerReachable = false;
    this.checkTimer = null;
    this.listeners = [];
  }

  init() {
    window.addEventListener("online", () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));
    this.checkHealth();
    this.startPeriodicHealthCheck();
  }

  async checkHealth() {
    if (!navigator.onLine) {
      this.isServerReachable = false;
      this.notify();
      return false;
    }

    try {
      const res = await api.health();
      this.isServerReachable = res && res.status === "ok";
    } catch {
      this.isServerReachable = false;
    }

    this.notify();
    return this.isServerReachable;
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    if (online) {
      this.checkHealth();
    } else {
      this.isServerReachable = false;
      this.notify();
    }
  }

  startPeriodicHealthCheck() {
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = setInterval(() => this.checkHealth(), 30000);
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
    for (const listener of this.listeners) {
      listener(status);
    }
    window.dispatchEvent(new CustomEvent("spark:connectivity-changed", { detail: status }));
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
