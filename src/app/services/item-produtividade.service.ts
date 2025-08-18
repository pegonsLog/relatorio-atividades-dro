import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ItemProdutividade } from '../models';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ItemProdutividadeService {
  private itens: ItemProdutividade[] = [];
  private itensSubject = new BehaviorSubject<ItemProdutividade[]>([]);
  private nextId = 1;

  constructor(private firestore: Firestore) {
    // Carregar itens persistidos do Firestore
    this.loadItensFromFirestore();
  }

  // Observables
  getItens(): Observable<ItemProdutividade[]> {
    return this.itensSubject.asObservable();
  }

  // CREATE
  create(item: Omit<ItemProdutividade, 'idProdutividade'>): ItemProdutividade {
    // Gera id incremental local com base no maior id carregado
    const novoId = this.getNextId();
    const novoItem: ItemProdutividade = {
      ...item,
      data: (item as any).data instanceof Date ? (item as any).data : new Date(),
      idProdutividade: novoId
    };

    // Persistir no Firestore (coleção 'item-produtividade')
    const ref = collection(this.firestore, 'item-produtividade');
    from(addDoc(ref, {
      ...novoItem,
      // Guardar ids como string quando aplicável
      idRelatorio: novoItem.idRelatorio != null ? String(novoItem.idRelatorio) : '',
      idAtividade: novoItem.idAtividade != null ? String(novoItem.idAtividade) : ''
    })).subscribe({
      next: () => {
        // Atualiza memória e observable
        this.itens.push(novoItem);
        this.itensSubject.next([...this.itens]);
        this.nextId = Math.max(this.nextId, novoId + 1);
      },
      error: (err) => {
        console.error('Erro ao criar item de produtividade no Firestore:', err);
      }
    });

    return novoItem;
  }

  // READ
  getById(id: number): ItemProdutividade | undefined {
    return this.itens.find(i => i.idProdutividade === id);
  }

  getAll(): ItemProdutividade[] {
    return [...this.itens];
  }

  getByAtividade(idAtividade: string | number): ItemProdutividade[] {
    const alvo = String(idAtividade);
    return this.itens.filter(i => String(i.idAtividade) === alvo);
  }

  getByRelatorio(idRelatorio: string | number): ItemProdutividade[] {
    const alvo = String(idRelatorio);
    return this.itens.filter(i => String(i.idRelatorio) === alvo);
  }

  // UPDATE
  update(id: number, dadosAtualizados: Partial<ItemProdutividade>): boolean {
    const index = this.itens.findIndex(i => i.idProdutividade === id);
    if (index === -1) return false;

    // Atualiza no Firestore localizando por campo idProdutividade
    this.updateOnFirestoreByItemId(id, dadosAtualizados);

    this.itens[index] = { ...this.itens[index], ...dadosAtualizados } as ItemProdutividade;
    this.itensSubject.next([...this.itens]);
    return true;
  }

  // DELETE
  delete(id: number): boolean {
    const index = this.itens.findIndex(i => i.idProdutividade === id);
    if (index === -1) return false;

    // Remover no Firestore
    this.deleteOnFirestoreByItemId(id);

    this.itens.splice(index, 1);
    this.itensSubject.next([...this.itens]);
    return true;
  }

  deleteByAtividade(idAtividade: string | number): number {
    const alvo = String(idAtividade);
    const itensRemovidos = this.itens.filter(i => String(i.idAtividade) === alvo);
    this.itens = this.itens.filter(i => String(i.idAtividade) !== alvo);
    this.itensSubject.next([...this.itens]);
    return itensRemovidos.length;
  }

  deleteByRelatorio(idRelatorio: string | number): number {
    const alvo = String(idRelatorio);
    const itensRemovidos = this.itens.filter(i => String(i.idRelatorio) === alvo);
    this.itens = this.itens.filter(i => String(i.idRelatorio) !== alvo);
    this.itensSubject.next([...this.itens]);
    return itensRemovidos.length;
  }

  // Análises e relatórios
  getTotalProdutividadePorAtividade(idAtividade: string | number): number {
    const alvo = String(idAtividade);
    return this.itens
      .filter(i => String(i.idAtividade) === alvo)
      .reduce((total, item) => total + item.qtdProd, 0);
  }

  getTotalProdutividadePorRelatorio(idRelatorio: string | number): number {
    const alvo = String(idRelatorio);
    return this.itens
      .filter(i => String(i.idRelatorio) === alvo)
      .reduce((total, item) => total + item.qtdProd, 0);
  }

  getProdutividadePorCodigo(codProd: number): ItemProdutividade[] {
    return this.itens.filter(i => i.codProd === codProd);
  }

  getEstatisticasPorCodigo(): { [codProd: number]: { total: number, quantidade: number, media: number } } {
    const stats: { [codProd: number]: { total: number, quantidade: number, media: number } } = {};
    
    this.itens.forEach(item => {
      if (!stats[item.codProd]) {
        stats[item.codProd] = { total: 0, quantidade: 0, media: 0 };
      }
      stats[item.codProd].total += item.qtdProd;
      stats[item.codProd].quantidade++;
    });

    // Calcular médias
    Object.keys(stats).forEach(cod => {
      const codNum = parseInt(cod);
      stats[codNum].media = stats[codNum].total / stats[codNum].quantidade;
    });

    return stats;
  }

  // Mock data para desenvolvimento
  private async loadItensFromFirestore(): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-produtividade');
      const snapshot = await getDocs(ref);
      const lista: ItemProdutividade[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        lista.push({
          idRelatorio: data['idRelatorio'] ?? '',
          idAtividade: data['idAtividade'] ?? '',
          idProdutividade: Number(data['idProdutividade']) || 0,
          codProd: Number(data['codProd']) || 0,
          qtdProd: Number(data['qtdProd']) || 0,
          data: data['data']?.toDate?.() || data['data'] || new Date()
        });
      });
      this.itens = lista;
      this.itensSubject.next([...this.itens]);
      this.recalculateNextId();
    } catch (err) {
      console.error('Erro ao carregar itens de produtividade do Firestore:', err);
      // Em caso de erro, iniciar vazio para evitar dados voláteis
      this.itens = [];
      this.itensSubject.next([]);
      this.nextId = 1;
    }
  }

  private recalculateNextId(): void {
    const maxId = this.itens.reduce((max, it) => Math.max(max, Number(it.idProdutividade) || 0), 0);
    this.nextId = maxId + 1;
  }

  private getNextId(): number {
    if (!this.itens || this.itens.length === 0) return this.nextId;
    const maxId = this.itens.reduce((max, it) => Math.max(max, Number(it.idProdutividade) || 0), 0);
    return Math.max(this.nextId, maxId + 1);
  }

  private async updateOnFirestoreByItemId(id: number, dadosAtualizados: Partial<ItemProdutividade>): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-produtividade');
      const q = query(ref, where('idProdutividade', '==', id));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await updateDoc(doc(this.firestore, 'item-produtividade', d.id), {
          ...dadosAtualizados,
          idRelatorio: dadosAtualizados.idRelatorio !== undefined ? String(dadosAtualizados.idRelatorio) : undefined,
          idAtividade: dadosAtualizados.idAtividade !== undefined ? String(dadosAtualizados.idAtividade) : undefined,
        } as any);
      }
    } catch (err) {
      console.error('Erro ao atualizar item de produtividade no Firestore:', err);
    }
  }

  private async deleteOnFirestoreByItemId(id: number): Promise<void> {
    try {
      const ref = collection(this.firestore, 'item-produtividade');
      const q = query(ref, where('idProdutividade', '==', id));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(this.firestore, 'item-produtividade', d.id));
      }
    } catch (err) {
      console.error('Erro ao deletar item de produtividade no Firestore:', err);
    }
  }
}
