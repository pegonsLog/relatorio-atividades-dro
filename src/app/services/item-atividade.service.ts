import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ItemAtividade } from '../models';
import { CrudStore } from './crud-store';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ItemAtividadeService extends CrudStore<ItemAtividade> {
  private injector = inject(Injector);

  constructor(private firestore: Firestore) {
    super('idAtividade');
    console.log('ItemAtividadeService: Construtor chamado');
    console.log('Firestore instance:', this.firestore);
    this.testFirestoreConnection();
    this.loadAtividadesFromFirestore();
  }

  // Teste de conexão com Firestore
  private async testFirestoreConnection(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      try {
        console.log('Testando conexão com Firestore...');
        const testRef = collection(this.firestore, 'test');
        console.log('Collection reference criada:', testRef);
        const snapshot = await getDocs(testRef);
        console.log('Query executada com sucesso. Documentos encontrados:', snapshot.size);
      } catch (error) {
        console.error('Erro na conexão com Firestore:', error);
      }
    });
  }

  // Observables
  getAtividades(): Observable<ItemAtividade[]> {
    return this.asObservable();
  }

  // CREATE
  create(item: ItemAtividade): void {
    const atividadeData = {
      ...item,
      tipo: 'atividade',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const relatoriosRef = collection(this.firestore, 'relatorios');
    from(addDoc(relatoriosRef, atividadeData)).subscribe({
      next: (docRef) => {
        const newItem = { ...item, idAtividade: docRef.id } as ItemAtividade;
        const currentItems = this.subject.value;
        this.subject.next([...currentItems, newItem]);
      },
      error: (error) => console.error('Erro ao criar atividade:', error)
    });
  }

  // READ
  override getById(id: number): ItemAtividade | undefined {
    return super.getById(id);
  }

  override getAll(): ItemAtividade[] {
    return super.getAll();
  }

  getByRelatorio(idRelatorio: number): ItemAtividade[] {
    return this.getAll().filter(a => a.idRelatorio === idRelatorio);
  }

  // UPDATE
  update(id: number | string, item: ItemAtividade): void {
    const atividadeData = {
      ...item,
      tipo: 'atividade',
      updatedAt: new Date()
    };
    const docRef = doc(this.firestore, 'relatorios', String(id));
    from(updateDoc(docRef, atividadeData)).subscribe({
      next: () => {
        const currentItems = this.subject.value;
        const index = currentItems.findIndex((item: ItemAtividade) => item.idAtividade === id);
        if (index !== -1) {
          currentItems[index] = { ...item, idAtividade: id };
          this.subject.next([...currentItems]);
        }
      },
      error: (error) => console.error('Erro ao atualizar atividade:', error)
    });
  }

  // DELETE
  delete(id: number | string): void {
    const docRef = doc(this.firestore, 'relatorios', String(id));
    from(deleteDoc(docRef)).subscribe({
      next: () => {
        const currentItems = this.subject.value;
        const filteredItems = currentItems.filter((item: ItemAtividade) => item.idAtividade !== id);
        this.subject.next(filteredItems);
      },
      error: (error) => console.error('Erro ao deletar atividade:', error)
    });
  }

  deleteByRelatorio(idRelatorio: number): number {
    const before = this.getAll();
    const toRemove = before.filter(a => a.idRelatorio === idRelatorio);
    const remain = before.filter(a => a.idRelatorio !== idRelatorio);
    this.setItems(remain);
    return toRemove.length;
  }

  // Filtros e buscas
  getByLocal(local: string): ItemAtividade[] {
    return this.getAll().filter(a => a.local.toLowerCase().includes(local.toLowerCase()));
  }

  getByCodAtv(codAtv: number): ItemAtividade[] {
    return this.getAll().filter(a => a.codAtv === codAtv);
  }

  getByPeriodo(dataInicio: Date, dataFim: Date): ItemAtividade[] {
    return this.getAll().filter(a => a.chegada >= dataInicio && a.chegada <= dataFim);
  }

  // ===== RELOAD APENAS ATIVIDADES =====
  async reloadData(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      await this.loadAtividadesFromFirestore();
    });
  }

  private async loadAtividadesFromFirestore(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      try {
        console.log('Carregando atividades do Firestore...');
        const atividadesRef = collection(this.firestore, 'relatorios');
        const q = query(atividadesRef, where('tipo', '==', 'atividade'));
        const querySnapshot = await getDocs(q);
        const atividades: ItemAtividade[] = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          console.log('Atividade encontrada:', docSnapshot.id, data);
          atividades.push({
            idAtividade: docSnapshot.id,
            idRelatorio: data['idRelatorio'] || 0,
            item: data['item'] || 0,
            acionamento: data['acionamento'] || '',
            chegada: data['chegada']?.toDate() || new Date(),
            solucao: data['solucao']?.toDate() || new Date(),
            saida: data['saida']?.toDate() || new Date(),
            codAtv: data['codAtv'] || 0,
            codOcor: data['codOcor'] || 0,
            qtdAgentes: data['qtdAgentes'] || 0,
            local: data['local'] || '',
            observacoes: data['observacoes'] || ''
          } as ItemAtividade);
        });
        console.log('Total de atividades carregadas:', atividades.length);
        atividades.sort((a, b) => (a.item || 0) - (b.item || 0));
        this.subject.next(atividades);
      } catch (error) {
        console.error('Erro ao carregar atividades do Firestore:', error);
        this.subject.next([]);
      }
    });
  }

}
