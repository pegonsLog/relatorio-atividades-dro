import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';
import { ItemOcorrencia } from '../models/item-ocorrencia.interface';

@Injectable({ providedIn: 'root' })
export class ItemOcorrenciaService {
  private itens: ItemOcorrencia[] = [];
  private itensSubject = new BehaviorSubject<ItemOcorrencia[]>([]);
  private nextId = 1;

  constructor(private firestore: Firestore) {
    this.loadItensFromFirestore();
  }

  // Observables
  getItens(): Observable<ItemOcorrencia[]> {
    return this.itensSubject.asObservable();
  }

  // CREATE
  create(item: Omit<ItemOcorrencia, 'idOcorrencia'>): ItemOcorrencia {
    const novoId = this.getNextId();
    const novoItem: ItemOcorrencia = {
      ...item,
      data: (item as any).data instanceof Date ? (item as any).data : new Date(),
      idOcorrencia: novoId,
    };

    const ref = collection(this.firestore, 'item-ocorrencia');
    from(addDoc(ref, {
      ...novoItem,
      idRelatorio: novoItem.idRelatorio != null ? String(novoItem.idRelatorio) : '',
      idAtividade: novoItem.idAtividade != null ? String(novoItem.idAtividade) : '',
    })).subscribe({
      next: () => {
        this.itens.push(novoItem);
        this.itensSubject.next([...this.itens]);
        this.nextId = Math.max(this.nextId, novoId + 1);
      },
      error: (err) => console.error('Erro ao criar item de ocorrência no Firestore:', err),
    });

    return novoItem;
  }

  // READ
  getById(id: number): ItemOcorrencia | undefined {
    return this.itens.find(i => i.idOcorrencia === id);
  }

  getAll(): ItemOcorrencia[] { return [...this.itens]; }

  getByAtividade(idAtividade: string | number): ItemOcorrencia[] {
    const alvo = String(idAtividade);
    return this.itens.filter(i => String(i.idAtividade) === alvo);
  }

  getByRelatorio(idRelatorio: string | number): ItemOcorrencia[] {
    const alvo = String(idRelatorio);
    return this.itens.filter(i => String(i.idRelatorio) === alvo);
  }

  // UPDATE
  update(id: number, dadosAtualizados: Partial<ItemOcorrencia>): boolean {
    const index = this.itens.findIndex(i => i.idOcorrencia === id);
    if (index === -1) return false;

    this.updateOnFirestoreByItemId(id, dadosAtualizados);

    this.itens[index] = { ...this.itens[index], ...dadosAtualizados } as ItemOcorrencia;
    this.itensSubject.next([...this.itens]);
    return true;
  }

  // DELETE (por item)
  async delete(id: number): Promise<boolean> {
    const index = this.itens.findIndex(i => i.idOcorrencia === id);
    if (index === -1) return false;

    try {
      await this.deleteOnFirestoreByItemId(id);
    } catch (err) {
      console.error('Erro ao deletar item de ocorrência no Firestore:', err);
    }

    this.itens.splice(index, 1);
    this.itensSubject.next([...this.itens]);
    return true;
  }

  // DELETE por FK
  async deleteByAtividade(idAtividade: string | number): Promise<number> {
    const alvo = String(idAtividade);
    await this.deleteOnFirestoreByAtividade(alvo);
    const removidos = this.itens.filter(i => String(i.idAtividade) === alvo);
    this.itens = this.itens.filter(i => String(i.idAtividade) !== alvo);
    this.itensSubject.next([...this.itens]);
    return removidos.length;
  }

  async deleteByRelatorio(idRelatorio: string | number): Promise<number> {
    const alvo = String(idRelatorio);
    await this.deleteOnFirestoreByRelatorio(alvo);
    const removidos = this.itens.filter(i => String(i.idRelatorio) === alvo);
    this.itens = this.itens.filter(i => String(i.idRelatorio) !== alvo);
    this.itensSubject.next([...this.itens]);
    return removidos.length;
  }

  // ===== Firestore helpers =====
  private async loadItensFromFirestore(): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-ocorrencia');
      const snapshot = await getDocs(ref);
      const lista: ItemOcorrencia[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        lista.push({
          idRelatorio: data['idRelatorio'] ?? '',
          idAtividade: data['idAtividade'] ?? '',
          idOcorrencia: Number(data['idOcorrencia']) || 0,
          codOcor: Number(data['codOcor']) || 0,
          nomeOcorrencia: data['nomeOcorrencia'] ?? '',
          qtdOcor: Number(data['qtdOcor']) || 0,
          data: data['data']?.toDate?.() || data['data'] || new Date(),
        });
      });
      this.itens = lista;
      this.itensSubject.next([...this.itens]);
      this.recalculateNextId();
    } catch (err) {
      console.error('Erro ao carregar itens de ocorrência do Firestore:', err);
      this.itens = [];
      this.itensSubject.next([]);
      this.nextId = 1;
    }
  }

  private async updateOnFirestoreByItemId(id: number, dadosAtualizados: Partial<ItemOcorrencia>): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-ocorrencia');
      const qfy = query(ref, where('idOcorrencia', '==', id));
      const snapshot = await getDocs(qfy);
      for (const d of snapshot.docs) {
        await updateDoc(doc(this.firestore, 'item-ocorrencia', d.id), {
          ...dadosAtualizados,
          idRelatorio: dadosAtualizados.idRelatorio !== undefined ? String(dadosAtualizados.idRelatorio) : undefined,
          idAtividade: dadosAtualizados.idAtividade !== undefined ? String(dadosAtualizados.idAtividade) : undefined,
        } as any);
      }
    } catch (err) {
      console.error('Erro ao atualizar item de ocorrência no Firestore:', err);
    }
  }

  private async deleteOnFirestoreByItemId(id: number): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-ocorrencia');
      const qfy = query(ref, where('idOcorrencia', '==', id));
      const snapshot = await getDocs(qfy);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(this.firestore, 'item-ocorrencia', d.id));
      }
    } catch (err) {
      console.error('Erro ao deletar item de ocorrência no Firestore:', err);
    }
  }

  private async deleteOnFirestoreByAtividade(idAtividade: string): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-ocorrencia');
      const qfy = query(ref, where('idAtividade', '==', idAtividade));
      const snapshot = await getDocs(qfy);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(this.firestore, 'item-ocorrencia', d.id));
      }
    } catch (err) {
      console.error('Erro ao deletar itens de ocorrência por atividade no Firestore:', err);
    }
  }

  private async deleteOnFirestoreByRelatorio(idRelatorio: string): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-ocorrencia');
      const qfy = query(ref, where('idRelatorio', '==', idRelatorio));
      const snapshot = await getDocs(qfy);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(this.firestore, 'item-ocorrencia', d.id));
      }
    } catch (err) {
      console.error('Erro ao deletar itens de ocorrência por relatório no Firestore:', err);
    }
  }

  // ===== ID helpers =====
  private recalculateNextId(): void {
    const maxId = this.itens.reduce((max, it) => Math.max(max, Number(it.idOcorrencia) || 0), 0);
    this.nextId = maxId + 1;
  }

  private getNextId(): number {
    if (!this.itens || this.itens.length === 0) return this.nextId;
    const maxId = this.itens.reduce((max, it) => Math.max(max, Number(it.idOcorrencia) || 0), 0);
    return Math.max(this.nextId, maxId + 1);
  }
}
