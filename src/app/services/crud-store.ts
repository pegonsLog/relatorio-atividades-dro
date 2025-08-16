import { BehaviorSubject, Observable } from 'rxjs';

// Classe utilitária genérica para reduzir duplicação entre services CRUD em memória
export class CrudStore<T extends Record<string, any>> {
  protected items: T[] = [];
  protected subject = new BehaviorSubject<T[]>([]);
  protected nextId = 1;

  constructor(private readonly idField: keyof T) {}

  asObservable(): Observable<T[]> {
    return this.subject.asObservable();
  }

  getAll(): T[] {
    return [...this.items];
  }

  getById(id: number): T | undefined {
    return this.items.find((i) => i[this.idField] === id);
  }

  protected createInternal(payload: Omit<T, typeof this.idField>): T {
    const novo = {
      ...(payload as object),
      [this.idField]: this.nextId++,
    } as T;
    this.items.push(novo);
    this.subject.next([...this.items]);
    return novo;
  }

  protected updateInternal(id: number, patch: Partial<T>): boolean {
    const idx = this.items.findIndex((i) => i[this.idField] === id);
    if (idx === -1) return false;
    this.items[idx] = { ...this.items[idx], ...patch, [this.idField]: id } as T;
    this.subject.next([...this.items]);
    return true;
  }

  protected deleteInternal(id: number): boolean {
    const idx = this.items.findIndex((i) => i[this.idField] === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    this.subject.next([...this.items]);
    return true;
  }

  protected setItems(list: T[], nextIdStart?: number): void {
    this.items = [...list];
    this.nextId = nextIdStart ?? (this.items.reduce((m, i) => Math.max(m, Number(i[this.idField]) || 0), 0) + 1);
    this.subject.next([...this.items]);
  }
}
