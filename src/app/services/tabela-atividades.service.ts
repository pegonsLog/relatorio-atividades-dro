import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { TabelaAtividade } from '../models/tabela-atividade.interface';

@Injectable({ providedIn: 'root' })
export class TabelaAtividadesService {
  private readonly firestore = inject(Firestore);

  list(): Observable<TabelaAtividade[]> {
    const col = collection(this.firestore, 'tabela-atividades');
    const qy = query(col, orderBy('codigo'));
    return from(getDocs(qy)).pipe(
      map(snapshot => {
        const itens: TabelaAtividade[] = [];
        snapshot.forEach(doc => itens.push(doc.data() as TabelaAtividade));
        return itens;
      }),
      catchError(err => {
        console.error('Erro ao carregar tabela-atividades:', err);
        return of([]);
      })
    );
  }

  getByCodigo(codigo: number): Observable<TabelaAtividade | undefined> {
    const ref = doc(this.firestore, `tabela-atividades/${String(codigo)}`);
    return from(getDoc(ref)).pipe(
      map(snap => (snap.exists() ? (snap.data() as TabelaAtividade) : undefined))
    );
  }

  create(item: TabelaAtividade): Promise<void> {
    const ref = doc(this.firestore, `tabela-atividades/${String(item.codigo)}`);
    return setDoc(ref, item);
  }

  update(codigo: number, partial: Partial<TabelaAtividade>): Promise<void> {
    const ref = doc(this.firestore, `tabela-atividades/${String(codigo)}`);
    return updateDoc(ref, partial as any);
  }

  delete(codigo: number): Promise<void> {
    const ref = doc(this.firestore, `tabela-atividades/${String(codigo)}`);
    return deleteDoc(ref);
  }
}
