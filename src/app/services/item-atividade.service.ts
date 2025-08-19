import { Injectable, inject, runInInjectionContext, Injector } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ItemAtividade } from '../models';
import { CrudStore } from './crud-store';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';
import { ItemProdutividadeService } from './item-produtividade.service';

@Injectable({
  providedIn: 'root'
})
export class ItemAtividadeService extends CrudStore<ItemAtividade> {
  private injector = inject(Injector);

  constructor(private firestore: Firestore, private itemProdService: ItemProdutividadeService) {
    super('idAtividade');
    // console removido
    // console removido
    this.testFirestoreConnection();
    this.loadAtividadesFromFirestore();
  }

  // Teste de conexão com Firestore
  private async testFirestoreConnection(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      try {
        // console removido
        const testRef = collection(this.firestore, 'test');
        // console removido
        const snapshot = await getDocs(testRef);
        // console removido
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
      idRelatorio: item?.idRelatorio != null ? String(item.idRelatorio) : '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const atividadesRef = collection(this.firestore, 'item-atividade');
    from(addDoc(atividadesRef, atividadeData)).subscribe({
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

  getByRelatorio(idRelatorio: string | number): ItemAtividade[] {
    const alvo = String(idRelatorio);
    return this.getAll().filter(a => String(a.idRelatorio) === alvo);
  }

  // UPDATE
  update(id: number | string, item: ItemAtividade): void {
    const atividadeData = {
      ...item,
      idRelatorio: item?.idRelatorio != null ? String(item.idRelatorio) : '',
      updatedAt: new Date()
    };
    const docRef = doc(this.firestore, 'item-atividade', String(id));
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
  delete(id: number | string): Promise<void> {
    // Deleção em cascata: primeiro apaga produtividades da atividade, depois a atividade
    return runInInjectionContext(this.injector, async () => {
      try {
        await this.itemProdService.deleteByAtividade(String(id));
      } catch (err) {
        console.error('Erro ao deletar produtividades vinculadas à atividade:', err);
      }
      try {
        const docRef = doc(this.firestore, 'item-atividade', String(id));
        await deleteDoc(docRef);
        const currentItems = this.subject.value;
        const filteredItems = currentItems.filter((item: ItemAtividade) => item.idAtividade !== id);
        this.subject.next(filteredItems);
      } catch (error) {
        console.error('Erro ao deletar atividade:', error);
      }
    });
  }

  async deleteByRelatorioCascade(idRelatorio: string | number): Promise<number> {
    const alvo = String(idRelatorio);
    let count = 0;
    await runInInjectionContext(this.injector, async () => {
      try {
        const atividadesRef = collection(this.firestore, 'item-atividade');
        const qAtv = query(atividadesRef, where('idRelatorio', '==', alvo));
        const snap = await getDocs(qAtv);
        for (const d of snap.docs) {
          const atvId = d.id;
          try {
            await this.itemProdService.deleteByAtividade(atvId);
          } catch (err) {
            console.error('Erro ao deletar produtividades da atividade', atvId, err);
          }
          await deleteDoc(doc(this.firestore, 'item-atividade', atvId));
          count++;
        }
        // Atualiza memória removendo as atividades do relatório
        const before = this.subject.value;
        const remain = before.filter(a => String(a.idRelatorio) !== alvo);
        this.subject.next(remain);
      } catch (err) {
        console.error('Erro ao deletar atividades por relatório no Firestore:', err);
      }
    });
    return count;
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
        // console removido
        const atividadesRef = collection(this.firestore, 'item-atividade');
        const querySnapshot = await getDocs(atividadesRef);
        const atividades: ItemAtividade[] = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          // console removido
          atividades.push({
            idAtividade: docSnapshot.id,
            idRelatorio: data['idRelatorio'] || '',
            item: data['item'] || 0,
            acionamento: data['acionamento'] || '',
            chegada: data['chegada']?.toDate() || new Date(),
            solucao: data['solucao']?.toDate?.() ?? null,
            saida: data['saida']?.toDate() || new Date(),
            codAtv: data['codAtv'] || 0,
            codOcor: data['codOcor'] || 0,
            qtdAgentes: data['qtdAgentes'] || 0,
            local: data['local'] || '',
            observacoes: data['observacoes'] || '',
            data: data['data']?.toDate?.() || data['data'] || new Date()
          } as ItemAtividade);
        });
        // console removido
        atividades.sort((a, b) => (a.item || 0) - (b.item || 0));
        this.subject.next(atividades);
      } catch (error) {
        console.error('Erro ao carregar atividades do Firestore:', error);
        this.subject.next([]);
      }
    });
  }

}
