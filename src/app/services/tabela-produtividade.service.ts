import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { TabelaProdutividade } from '../models/tabela-produtividade.interface';

@Injectable({ providedIn: 'root' })
export class TabelaProdutividadeService {
  private readonly firestore = inject(Firestore);

  list(): Observable<TabelaProdutividade[]> {
    const col = collection(this.firestore, 'tabela-produtividade');
    const qy = query(col, orderBy('codigo'));
    return from(getDocs(qy)).pipe(
      map(snapshot => {
        const itens: TabelaProdutividade[] = [];
        snapshot.forEach(doc => itens.push(doc.data() as TabelaProdutividade));
        return itens;
      }),
      catchError(err => {
        console.error('Erro ao carregar tabela-produtividade:', err);
        return of([]);
      })
    );
  }

  getByCodigo(codigo: number): Observable<TabelaProdutividade | undefined> {
    const ref = doc(this.firestore, `tabela-produtividade/${String(codigo)}`);
    return from(getDoc(ref)).pipe(
      map(snap => (snap.exists() ? (snap.data() as TabelaProdutividade) : undefined))
    );
  }

  create(item: TabelaProdutividade): Promise<void> {
    const ref = doc(this.firestore, `tabela-produtividade/${String(item.codigo)}`);
    return setDoc(ref, item);
  }

  update(codigo: number, partial: Partial<TabelaProdutividade>): Promise<void> {
    const ref = doc(this.firestore, `tabela-produtividade/${String(codigo)}`);
    return updateDoc(ref, partial as any);
  }

  delete(codigo: number): Promise<void> {
    const ref = doc(this.firestore, `tabela-produtividade/${String(codigo)}`);
    return deleteDoc(ref);
  }
}
