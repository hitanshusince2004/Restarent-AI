// Client-side cross-tab real-time event bus using BroadcastChannel with fallback to localStorage

export interface SyncOrderEvent {
  id: string;
  tableNumber: string;
  floor: string;
  orderNumber: string;
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  items: Array<{
    id?: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
    isVeg?: boolean;
    station?: 'Tandoor' | 'Curry' | 'Breads' | 'Beverage';
  }>;
  total: number;
  notes?: string;
  placedAt: string;
  serverName?: string;
}

export type SyncEvent =
  | { type: 'ORDER_PLACED'; payload: SyncOrderEvent }
  | { type: 'ORDER_STATUS_UPDATED'; payload: { orderId: string; status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' } }
  | { type: 'WAITER_CALLED'; payload: { tableNumber: string; message: string; timestamp: string } }
  | { type: 'BILL_REQUESTED'; payload: { tableNumber: string; total: number; timestamp: string } };

class SyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<(event: SyncEvent) => void> = [];

  constructor() {
    if (typeof window === 'undefined') return;

    if (typeof (window as any).BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('restaurant_os_events');
      this.channel.onmessage = (msg) => {
        if (msg.data && msg.data.type) {
          this.notifyListeners(msg.data);
        }
      };
    } else {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'restaurant_os_sync_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {}
        }
      });
    }
  }

  public publish(event: SyncEvent) {
    if (typeof window === 'undefined') return;
    if (this.channel) {
      this.channel.postMessage(event);
    } else {
      localStorage.setItem('restaurant_os_sync_event', JSON.stringify({ ...event, _ts: Date.now() }));
    }
    // Also notify local listeners in the same window/tab
    this.notifyListeners(event);
  }

  public subscribe(handler: (event: SyncEvent) => void) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  private notifyListeners(event: SyncEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  }
}

export const syncBus = new SyncBus();
