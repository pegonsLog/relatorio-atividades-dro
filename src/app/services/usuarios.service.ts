import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { Usuario } from '../models/usuario.interface';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly firestore = inject(Firestore);

  list(): Observable<Usuario[]> {
    const col = collection(this.firestore, 'usuarios');
    const docsPromise = getDocs(col);
    
    return from(docsPromise).pipe(
      map(snapshot => {
        const usuarios: Usuario[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          usuarios.push(data as Usuario);
        });
        return usuarios;
      }),
      catchError(error => {
        console.error('Erro ao carregar usuários:', error);
        return of([]);
      })
    );
  }

  getByMatricula(matricula: number): Observable<Usuario | undefined> {
    const ref = doc(this.firestore, `usuarios/${String(matricula)}`);
    return from(getDoc(ref)).pipe(
      map(snap => (snap.exists() ? (snap.data() as Usuario) : undefined))
    );
  }

  create(usuario: Usuario): Promise<void> {
    const ref = doc(this.firestore, `usuarios/${String(usuario.matricula)}`);
    return setDoc(ref, usuario);
  }

  update(matricula: number, partial: Partial<Usuario>): Promise<void> {
    const ref = doc(this.firestore, `usuarios/${String(matricula)}`);
    return updateDoc(ref, partial as any);
  }

  delete(matricula: number): Promise<void> {
    const ref = doc(this.firestore, `usuarios/${String(matricula)}`);
    return deleteDoc(ref);
  }
}
