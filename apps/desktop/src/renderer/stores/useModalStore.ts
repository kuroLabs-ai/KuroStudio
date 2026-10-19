export type ActiveModal = 'settings' | 'export' | 'store' | null;

type Listener = () => void;

class ModalStore {
  private activeModal: ActiveModal = null;
  private listeners = new Set<Listener>();

  public getActiveModal(): ActiveModal {
    return this.activeModal;
  }

  public openModal(modal: ActiveModal): void {
    this.activeModal = modal;
    this.notify();
  }

  public closeModal(): void {
    this.activeModal = null;
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const modalStore = new ModalStore();
