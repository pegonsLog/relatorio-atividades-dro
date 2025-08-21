import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { RelatorioBase } from '../models';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from '@angular/fire/firestore';
import { ItemAtividadeService } from './item-atividade.service';
import { ItemProdutividadeService } from './item-produtividade.service';
import { UserContextService } from './user-context.service';

@Injectable({ providedIn: 'root' })
export class RelatorioBaseService {
  private readonly subject = new BehaviorSubject<RelatorioBase[]>([]);
  private injector = inject(Injector);
  private readonly userCtx = inject(UserContextService);

  constructor(private firestore: Firestore, private atvService: ItemAtividadeService, private prodService: ItemProdutividadeService) {
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
    const userId = this.userCtx.getCurrentUserId() || undefined;
    const relatorioData = {
      ...relatorio,
      idRelatorio: (relatorio as any)?.idRelatorio ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
      criadoPor: userId,
      modificadoPor: userId,
    } as any;

    const relatoriosRef = collection(this.firestore, 'relatorio-base');
    from(addDoc(relatoriosRef, relatorioData)).subscribe({
      next: (docRef) => {
        const novo: RelatorioBase = {
          ...relatorio,
          idRelatorio: docRef.id,
          createdAt: relatorioData.createdAt,
          updatedAt: relatorioData.updatedAt,
          criadoPor: relatorioData.criadoPor,
          modificadoPor: relatorioData.modificadoPor,
        };
        this.subject.next([...this.subject.value, novo]);
      },
      error: (error) => console.error('Erro ao criar relatório base:', error),
    });
  }

  // UPDATE
  update(id: string | number, relatorio: RelatorioBase): void {
    const userId = this.userCtx.getCurrentUserId() || undefined;
    const data = {
      ...relatorio,
      idRelatorio: (relatorio as any)?.idRelatorio ?? '',
      updatedAt: new Date(),
      modificadoPor: userId,
    } as any;

    const ref = doc(this.firestore, 'relatorio-base', String(id));
    from(updateDoc(ref, data)).subscribe({
      next: () => {
        const arr = [...this.subject.value];
        const i = arr.findIndex(r => r.idRelatorio === id);
        if (i !== -1) {
          arr[i] = { ...arr[i], ...relatorio, idRelatorio: id, updatedAt: data.updatedAt, modificadoPor: data.modificadoPor } as RelatorioBase;
          this.subject.next(arr);
        }
      },
      error: (error) => console.error('Erro ao atualizar relatório base:', error),
    });
  }

  // DELETE com cascata
  delete(id: string | number): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const alvo = String(id);
      try {
        // 1) Deleta itens de produtividade do relatório
        await this.prodService.deleteByRelatorio(alvo);
      } catch (err) {
        console.error('Erro ao deletar itens de produtividade do relatório:', err);
      }
      try {
        // 2) Deleta atividades do relatório (cada uma também deleta suas produtividades vinculadas por segurança)
        await this.atvService.deleteByRelatorioCascade(alvo);
      } catch (err) {
        console.error('Erro ao deletar atividades do relatório:', err);
      }
      try {
        // 3) Finalmente, deleta o relatório
        const ref = doc(this.firestore, 'relatorio-base', alvo);
        await deleteDoc(ref);
        this.subject.next(this.subject.value.filter(r => r.idRelatorio !== id));
      } catch (error) {
        console.error('Erro ao deletar relatório base:', error);
      }
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
            updatedAt: data['updatedAt']?.toDate?.() || data['updatedAt'] || undefined,
            criadoPor: data['criadoPor'] || undefined,
            modificadoPor: data['modificadoPor'] || undefined,
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
