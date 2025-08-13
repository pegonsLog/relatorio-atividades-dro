import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RelatorioBase } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RelatorioBaseService {
  private relatorios: RelatorioBase[] = [];
  private relatoriosSubject = new BehaviorSubject<RelatorioBase[]>([]);
  private nextId = 1;

  constructor() {
    this.loadMockData();
  }

  // Observables
  getRelatorios(): Observable<RelatorioBase[]> {
    return this.relatoriosSubject.asObservable();
  }

  // CREATE
  create(relatorio: Omit<RelatorioBase, 'idRelatorio'>): RelatorioBase {
    const novoRelatorio: RelatorioBase = {
      ...relatorio,
      idRelatorio: this.nextId++
    };
    
    this.relatorios.push(novoRelatorio);
    this.relatoriosSubject.next([...this.relatorios]);
    return novoRelatorio;
  }

  // READ
  getById(id: number): RelatorioBase | undefined {
    return this.relatorios.find(r => r.idRelatorio === id);
  }

  getAll(): RelatorioBase[] {
    return [...this.relatorios];
  }

  // UPDATE
  update(id: number, dadosAtualizados: Partial<RelatorioBase>): boolean {
    const index = this.relatorios.findIndex(r => r.idRelatorio === id);
    if (index !== -1) {
      this.relatorios[index] = { ...this.relatorios[index], ...dadosAtualizados };
      this.relatoriosSubject.next([...this.relatorios]);
      return true;
    }
    return false;
  }

  // DELETE
  delete(id: number): boolean {
    const index = this.relatorios.findIndex(r => r.idRelatorio === id);
    if (index !== -1) {
      this.relatorios.splice(index, 1);
      this.relatoriosSubject.next([...this.relatorios]);
      return true;
    }
    return false;
  }

  // Filtros e buscas
  getByGerencia(gerencia: string): RelatorioBase[] {
    return this.relatorios.filter(r => r.gerencia.toLowerCase().includes(gerencia.toLowerCase()));
  }

  getByData(data: Date): RelatorioBase[] {
    return this.relatorios.filter(r => 
      r.data.toDateString() === data.toDateString()
    );
  }

  getByTurno(turno: string): RelatorioBase[] {
    return this.relatorios.filter(r => r.turno === turno);
  }

  // Mock data para desenvolvimento
  private loadMockData(): void {
    const mockData: RelatorioBase[] = [
      {
        idRelatorio: 1,
        gerencia: 'Operações',
        data: new Date(),
        diaSemana: 'Segunda-feira',
        turno: 'Manhã',
        mat1: 12345,
        mat2: 67890,
        coord: 111,
        superv: 222
      }
    ];
    
    this.relatorios = mockData;
    this.nextId = 2;
    this.relatoriosSubject.next([...this.relatorios]);
  }
}
