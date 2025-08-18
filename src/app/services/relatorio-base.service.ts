import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { RelatorioBase } from '../models';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class RelatorioBaseService {
  private readonly subject = new BehaviorSubject<RelatorioBase[]>([]);
  private injector = inject(Injector);

  constructor(private firestore: Firestore) {
    this.loadFromFirestore();
  }

  // Observable público da lista
  getRelatorios$(): Observable<RelatorioBase[]> {
    return this.subject.asObservable();
  }

  // Snapshot atual
  getAll(): RelatorioBase[] {
    return this.subject.value;
  }

  getById(id: string | number): RelatorioBase | undefined {
    return this.subject.value.find(r => r.idRelatorio === id);
  }

  // CREATE
  create(relatorio: RelatorioBase): void {
    const relatorioData = {
      ...relatorio,
      idRelatorio: (relatorio as any)?.idRelatorio ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const relatoriosRef = collection(this.firestore, 'relatorio-base');
    from(addDoc(relatoriosRef, relatorioData)).subscribe({
      next: (docRef) => {
        const novo: RelatorioBase = { ...relatorio, idRelatorio: docRef.id, createdAt: relatorioData.createdAt };
        this.subject.next([...this.subject.value, novo]);
      },
      error: (error) => console.error('Erro ao criar relatório base:', error),
    });
  }

  // UPDATE
  update(id: string | number, relatorio: RelatorioBase): void {
    const data = {
      ...relatorio,
      idRelatorio: (relatorio as any)?.idRelatorio ?? '',
      updatedAt: new Date(),
    } as any;

    const ref = doc(this.firestore, 'relatorio-base', String(id));
    from(updateDoc(ref, data)).subscribe({
      next: () => {
        const arr = [...this.subject.value];
        const i = arr.findIndex(r => r.idRelatorio === id);
        if (i !== -1) {
          arr[i] = { ...relatorio, idRelatorio: id };
          this.subject.next(arr);
        }
      },
      error: (error) => console.error('Erro ao atualizar relatório base:', error),
    });
  }

  // DELETE
  delete(id: string | number): void {
    const ref = doc(this.firestore, 'relatorio-base', String(id));
    from(deleteDoc(ref)).subscribe({
      next: () => {
        this.subject.next(this.subject.value.filter(r => r.idRelatorio !== id));
      },
      error: (error) => console.error('Erro ao deletar relatório base:', error),
    });
  }

  // Reload manual
  async reload(): Promise<void> {
    await this.loadFromFirestore();
  }


  // Carregar do Firestore
  private async loadFromFirestore(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      try {
        const relatoriosRef = collection(this.firestore, 'relatorio-base');
        const snap = await getDocs(relatoriosRef);

        const list: RelatorioBase[] = [];
        snap.forEach(d => {
          const data = d.data() as any;
          list.push({
            idRelatorio: d.id,
            gerencia: data['gerencia'] || '',
            data: data['data']?.toDate?.() || data['data'] || new Date(),
            diaSemana: data['diaSemana'] || '',
            turno: data['turno'] || '',
            mat1: data['mat1'] || 0,
            mat2: data['mat2'] || 0,
            coord: data['coord'] || 0,
            superv: data['superv'] || 0,
            createdAt: data['createdAt']?.toDate?.() || data['createdAt'] || undefined,
          });
        });

        // Ordena por data asc
        list.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        this.subject.next(list);
      } catch (e) {
        console.error('Erro ao carregar relatórios base do Firestore:', e);
        this.subject.next([]);
      }
    });
  }
}
