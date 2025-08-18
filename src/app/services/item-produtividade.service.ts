import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ItemProdutividade } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ItemProdutividadeService {
  private itens: ItemProdutividade[] = [];
  private itensSubject = new BehaviorSubject<ItemProdutividade[]>([]);
  private nextId = 1;

  constructor() {
    this.loadMockData();
  }

  // Observables
  getItens(): Observable<ItemProdutividade[]> {
    return this.itensSubject.asObservable();
  }

  // CREATE
  create(item: Omit<ItemProdutividade, 'idProdutividade'>): ItemProdutividade {
    const novoItem: ItemProdutividade = {
      ...item,
      // garante que exista uma data
      data: (item as any).data instanceof Date ? (item as any).data : new Date(),
      idProdutividade: this.nextId++
    };
    
    this.itens.push(novoItem);
    this.itensSubject.next([...this.itens]);
    return novoItem;
  }

  // READ
  getById(id: number): ItemProdutividade | undefined {
    return this.itens.find(i => i.idProdutividade === id);
  }

  getAll(): ItemProdutividade[] {
    return [...this.itens];
  }

  getByAtividade(idAtividade: number): ItemProdutividade[] {
    return this.itens.filter(i => i.idAtividade === idAtividade);
  }

  getByRelatorio(idRelatorio: number): ItemProdutividade[] {
    return this.itens.filter(i => i.idRelatorio === idRelatorio);
  }

  // UPDATE
  update(id: number, dadosAtualizados: Partial<ItemProdutividade>): boolean {
    const index = this.itens.findIndex(i => i.idProdutividade === id);
    if (index !== -1) {
      this.itens[index] = { ...this.itens[index], ...dadosAtualizados };
      this.itensSubject.next([...this.itens]);
      return true;
    }
    return false;
  }

  // DELETE
  delete(id: number): boolean {
    const index = this.itens.findIndex(i => i.idProdutividade === id);
    if (index !== -1) {
      this.itens.splice(index, 1);
      this.itensSubject.next([...this.itens]);
      return true;
    }
    return false;
  }

  deleteByAtividade(idAtividade: number): number {
    const itensRemovidos = this.itens.filter(i => i.idAtividade === idAtividade);
    this.itens = this.itens.filter(i => i.idAtividade !== idAtividade);
    this.itensSubject.next([...this.itens]);
    return itensRemovidos.length;
  }

  deleteByRelatorio(idRelatorio: number): number {
    const itensRemovidos = this.itens.filter(i => i.idRelatorio === idRelatorio);
    this.itens = this.itens.filter(i => i.idRelatorio !== idRelatorio);
    this.itensSubject.next([...this.itens]);
    return itensRemovidos.length;
  }

  // Análises e relatórios
  getTotalProdutividadePorAtividade(idAtividade: number): number {
    return this.itens
      .filter(i => i.idAtividade === idAtividade)
      .reduce((total, item) => total + item.qtdProd, 0);
  }

  getTotalProdutividadePorRelatorio(idRelatorio: number): number {
    return this.itens
      .filter(i => i.idRelatorio === idRelatorio)
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
  private loadMockData(): void {
    const mockData: ItemProdutividade[] = [
      {
        idRelatorio: 1,
        idAtividade: 1,
        idProdutividade: 1,
        codProd: 301,
        qtdProd: 15,
        data: new Date()
      },
      {
        idRelatorio: 1,
        idAtividade: 1,
        idProdutividade: 2,
        codProd: 302,
        qtdProd: 8,
        data: new Date()
      }
    ];
    
    this.itens = mockData;
    this.nextId = 3;
    this.itensSubject.next([...this.itens]);
  }
}
