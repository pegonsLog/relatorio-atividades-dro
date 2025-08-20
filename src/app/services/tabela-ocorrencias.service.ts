import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { TabelaOcorrencia } from '../models/tabela-ocorrencia.interface';

@Injectable({ providedIn: 'root' })
export class TabelaOcorrenciasService {
  private readonly firestore = inject(Firestore);

  list(): Observable<TabelaOcorrencia[]> {
    const col = collection(this.firestore, 'tabela-ocorrencias');
    const qy = query(col, orderBy('codigo'));
    return from(getDocs(qy)).pipe(
      map(snapshot => {
        const itens: TabelaOcorrencia[] = [];
        snapshot.forEach(doc => itens.push(doc.data() as TabelaOcorrencia));
        return itens;
      }),
      catchError(err => {
        console.error('Erro ao carregar tabela-ocorrencias:', err);
        return of([]);
      })
    );
  }

  getByCodigo(codigo: number): Observable<TabelaOcorrencia | undefined> {
    const ref = doc(this.firestore, `tabela-ocorrencias/${String(codigo)}`);
    return from(getDoc(ref)).pipe(
      map(snap => (snap.exists() ? (snap.data() as TabelaOcorrencia) : undefined))
    );
  }

  create(item: TabelaOcorrencia): Promise<void> {
    const ref = doc(this.firestore, `tabela-ocorrencias/${String(item.codigo)}`);
    return setDoc(ref, item);
  }

  update(codigo: number, partial: Partial<TabelaOcorrencia>): Promise<void> {
    const ref = doc(this.firestore, `tabela-ocorrencias/${String(codigo)}`);
    return updateDoc(ref, partial as any);
  }

  delete(codigo: number): Promise<void> {
    const ref = doc(this.firestore, `tabela-ocorrencias/${String(codigo)}`);
    return deleteDoc(ref);
  }
}
