import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Agente } from '../models/agente.interface';

@Injectable({ providedIn: 'root' })
export class AgentesService {
  private readonly firestore = inject(Firestore);

  list(): Observable<Agente[]> {
    const col = collection(this.firestore, 'agentes');
    const qy = query(col, orderBy('matricula'));
    const docsPromise = getDocs(qy);

    return from(docsPromise).pipe(
      map(snapshot => {
        const agentes: Agente[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          agentes.push(data as Agente);
        });
        return agentes;
      }),
      catchError(error => {
        console.error('Erro ao carregar agentes:', error);
        return of([]);
      })
    );
  }

  getByMatricula(matricula: number): Observable<Agente | undefined> {
    const ref = doc(this.firestore, `agentes/${String(matricula)}`);
    return from(getDoc(ref)).pipe(
      map(snap => (snap.exists() ? (snap.data() as Agente) : undefined))
    );
  }

  create(agente: Agente): Promise<void> {
    const ref = doc(this.firestore, `agentes/${String(agente.matricula)}`);
    return setDoc(ref, agente);
  }

  update(matricula: number, partial: Partial<Agente>): Promise<void> {
    const ref = doc(this.firestore, `agentes/${String(matricula)}`);
    return updateDoc(ref, partial as any);
  }

  delete(matricula: number): Promise<void> {
    const ref = doc(this.firestore, `agentes/${String(matricula)}`);
    return deleteDoc(ref);
  }
}
