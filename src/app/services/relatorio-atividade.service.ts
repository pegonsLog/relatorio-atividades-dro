import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RelatorioAtividade } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RelatorioAtividadeService {
  private atividades: RelatorioAtividade[] = [];
  private atividadesSubject = new BehaviorSubject<RelatorioAtividade[]>([]);
  private nextId = 1;

  constructor() {
    this.loadMockData();
  }

  // Observables
  getAtividades(): Observable<RelatorioAtividade[]> {
    return this.atividadesSubject.asObservable();
  }

  // CREATE
  create(atividade: Omit<RelatorioAtividade, 'idAtividade'>): RelatorioAtividade {
    const novaAtividade: RelatorioAtividade = {
      ...atividade,
      idAtividade: this.nextId++
    };
    
    this.atividades.push(novaAtividade);
    this.atividadesSubject.next([...this.atividades]);
    return novaAtividade;
  }

  // READ
  getById(id: number): RelatorioAtividade | undefined {
    return this.atividades.find(a => a.idAtividade === id);
  }

  getAll(): RelatorioAtividade[] {
    return [...this.atividades];
  }

  getByRelatorio(idRelatorio: number): RelatorioAtividade[] {
    return this.atividades.filter(a => a.idRelatorio === idRelatorio);
  }

  // UPDATE
  update(id: number, dadosAtualizados: Partial<RelatorioAtividade>): boolean {
    const index = this.atividades.findIndex(a => a.idAtividade === id);
    if (index !== -1) {
      this.atividades[index] = { ...this.atividades[index], ...dadosAtualizados };
      this.atividadesSubject.next([...this.atividades]);
      return true;
    }
    return false;
  }

  // DELETE
  delete(id: number): boolean {
    const index = this.atividades.findIndex(a => a.idAtividade === id);
    if (index !== -1) {
      this.atividades.splice(index, 1);
      this.atividadesSubject.next([...this.atividades]);
      return true;
    }
    return false;
  }

  deleteByRelatorio(idRelatorio: number): number {
    const atividadesRemovidas = this.atividades.filter(a => a.idRelatorio === idRelatorio);
    this.atividades = this.atividades.filter(a => a.idRelatorio !== idRelatorio);
    this.atividadesSubject.next([...this.atividades]);
    return atividadesRemovidas.length;
  }

  // Filtros e buscas
  getByLocal(local: string): RelatorioAtividade[] {
    return this.atividades.filter(a => a.local.toLowerCase().includes(local.toLowerCase()));
  }

  getByCodAtv(codAtv: number): RelatorioAtividade[] {
    return this.atividades.filter(a => a.codAtv === codAtv);
  }

  getByPeriodo(dataInicio: Date, dataFim: Date): RelatorioAtividade[] {
    return this.atividades.filter(a => 
      a.chegada >= dataInicio && a.chegada <= dataFim
    );
  }

  // Mock data para desenvolvimento
  private loadMockData(): void {
    const agora = new Date();
    const mockData: RelatorioAtividade[] = [
      {
        idAtividade: 1,
        idRelatorio: 1,
        item: 1,
        acionamento: 'Chamado via rádio',
        chegada: new Date(agora.getTime() - 2 * 60 * 60 * 1000), // 2h atrás
        solucao: new Date(agora.getTime() - 1 * 60 * 60 * 1000), // 1h atrás
        saida: new Date(agora.getTime() - 30 * 60 * 1000), // 30min atrás
        codAtv: 101,
        codOcor: 201,
        qtdAgentes: 2,
        local: 'Setor A - Linha 1',
        observacoes: 'Manutenção preventiva realizada com sucesso'
      }
    ];
    
    this.atividades = mockData;
    this.nextId = 2;
    this.atividadesSubject.next([...this.atividades]);
  }
}
