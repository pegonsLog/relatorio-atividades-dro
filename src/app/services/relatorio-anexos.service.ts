import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import {
  Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where
} from '@angular/fire/firestore';
import {
  Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject
} from '@angular/fire/storage';
import { RelatorioAnexo } from '../models/relatorio-anexo.interface';
import { UserContextService } from './user-context.service';

/** Progresso de um upload em andamento */
export interface ProgressoUpload {
  /** 0 a 100 */
  percentual: number;
  concluido: boolean;
}

@Injectable({ providedIn: 'root' })
export class RelatorioAnexosService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly userCtx = inject(UserContextService);
  private readonly injector = inject(Injector);

  private readonly COLECAO = 'relatorio-anexo';
  /** Tamanho máximo aceito por arquivo (20 MB), alinhado ao storage.rules */
  readonly TAMANHO_MAXIMO = 20 * 1024 * 1024;

  /** Lista os anexos de um relatório, mais recentes primeiro */
  listarPorRelatorio(idRelatorio: string): Observable<RelatorioAnexo[]> {
    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, this.COLECAO);
      const qy = query(col, where('idRelatorio', '==', String(idRelatorio)));
      return from(getDocs(qy)).pipe(
        map(snap => {
          const itens: RelatorioAnexo[] = [];
          snap.forEach(d => {
            const dados = d.data() as any;
            itens.push({
              idAnexo: d.id,
              idRelatorio: dados['idRelatorio'] || '',
              nome: dados['nome'] || '',
              descricao: dados['descricao'] || '',
              nomeArquivo: dados['nomeArquivo'] || '',
              tipo: dados['tipo'] || '',
              tamanho: Number(dados['tamanho']) || 0,
              caminho: dados['caminho'] || '',
              url: dados['url'] || '',
              createdAt: dados['createdAt']?.toDate?.() || dados['createdAt'] || undefined,
              updatedAt: dados['updatedAt']?.toDate?.() || dados['updatedAt'] || undefined,
              criadoPor: dados['criadoPor'] || undefined,
            });
          });
          itens.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });
          return itens;
        }),
        catchError(erro => {
          console.error('Erro ao listar anexos:', erro);
          return of([] as RelatorioAnexo[]);
        })
      );
    });
  }

  /**
   * Envia o arquivo para o Storage e grava os metadados no Firestore.
   * `onProgresso` recebe o percentual enquanto o upload acontece.
   */
  async enviar(
    idRelatorio: string,
    arquivo: File,
    dados: { nome: string; descricao: string },
    onProgresso?: (p: ProgressoUpload) => void
  ): Promise<RelatorioAnexo> {
    if (arquivo.size > this.TAMANHO_MAXIMO) {
      throw new Error(`Arquivo maior que o limite de ${this.formatarTamanho(this.TAMANHO_MAXIMO)}.`);
    }

    // Prefixo com timestamp evita colisão entre arquivos de mesmo nome
    const nomeSeguro = this.sanitizarNomeArquivo(arquivo.name);
    const caminho = `relatorio-anexos/${idRelatorio}/${Date.now()}_${nomeSeguro}`;

    const url = await runInInjectionContext(this.injector, async () => {
      const referencia = ref(this.storage, caminho);
      const tarefa = uploadBytesResumable(referencia, arquivo, {
        contentType: arquivo.type || 'application/octet-stream',
      });

      await new Promise<void>((resolve, reject) => {
        tarefa.on(
          'state_changed',
          snap => {
            const pct = snap.totalBytes
              ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              : 0;
            onProgresso?.({ percentual: pct, concluido: false });
          },
          erro => reject(erro),
          () => resolve()
        );
      });

      return getDownloadURL(tarefa.snapshot.ref);
    });

    onProgresso?.({ percentual: 100, concluido: true });

    const agora = new Date();
    const registro = {
      idRelatorio: String(idRelatorio),
      nome: (dados.nome || arquivo.name).trim(),
      descricao: (dados.descricao || '').trim(),
      nomeArquivo: arquivo.name,
      tipo: arquivo.type || 'application/octet-stream',
      tamanho: arquivo.size,
      caminho,
      url,
      createdAt: agora,
      updatedAt: agora,
      criadoPor: this.userCtx.getCurrentUserId() || undefined,
    };

    return runInInjectionContext(this.injector, async () => {
      try {
        const docRef = await addDoc(collection(this.firestore, this.COLECAO), registro);
        return { ...registro, idAnexo: docRef.id } as RelatorioAnexo;
      } catch (erro) {
        // Metadados falharam: remove o arquivo para não deixar órfão no Storage
        try {
          await deleteObject(ref(this.storage, caminho));
        } catch { /* melhor esforço */ }
        throw erro;
      }
    });
  }

  /** Atualiza apenas os metadados editáveis (nome e descrição) */
  atualizar(idAnexo: string, dados: { nome: string; descricao: string }): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const referencia = doc(this.firestore, this.COLECAO, idAnexo);
      await updateDoc(referencia, {
        nome: (dados.nome || '').trim(),
        descricao: (dados.descricao || '').trim(),
        updatedAt: new Date(),
      });
    });
  }

  /** Exclui o arquivo do Storage e o documento de metadados */
  excluir(anexo: RelatorioAnexo): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      // Apaga o arquivo primeiro; se o objeto já não existir, segue adiante
      if (anexo.caminho) {
        try {
          await deleteObject(ref(this.storage, anexo.caminho));
        } catch (erro: any) {
          if (erro?.code !== 'storage/object-not-found') {
            console.error('Erro ao excluir arquivo do Storage:', erro);
          }
        }
      }
      if (anexo.idAnexo) {
        await deleteDoc(doc(this.firestore, this.COLECAO, anexo.idAnexo));
      }
    });
  }

  /** Remove todos os anexos de um relatório (usado na exclusão em cascata) */
  async excluirPorRelatorio(idRelatorio: string): Promise<number> {
    const anexos = await new Promise<RelatorioAnexo[]>(resolve => {
      this.listarPorRelatorio(idRelatorio).subscribe({
        next: lista => resolve(lista),
        error: () => resolve([]),
      });
    });
    let total = 0;
    for (const anexo of anexos) {
      try {
        await this.excluir(anexo);
        total++;
      } catch (erro) {
        console.error('Erro ao excluir anexo do relatório:', erro);
      }
    }
    return total;
  }

  /** Substitui caracteres problemáticos no nome do arquivo */
  private sanitizarNomeArquivo(nome: string): string {
    return (nome || 'arquivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
  }

  /** Formata bytes em texto legível */
  formatarTamanho(bytes: number): string {
    if (!bytes) return '0 B';
    const unidades = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
    const valor = bytes / Math.pow(1024, i);
    return `${valor.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
  }
}
