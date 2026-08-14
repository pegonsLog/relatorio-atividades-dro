import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import {
  Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where
} from '@angular/fire/firestore';
import { RelatorioAnexo } from '../models/relatorio-anexo.interface';
import { UserContextService } from './user-context.service';
import { firebaseConfig } from '../firebase.config';

/** Progresso de um upload em andamento */
export interface ProgressoUpload {
  /** 0 a 100 */
  percentual: number;
  concluido: boolean;
}

@Injectable({ providedIn: 'root' })
export class RelatorioAnexosService {
  private readonly firestore = inject(Firestore);
  private readonly userCtx = inject(UserContextService);
  private readonly injector = inject(Injector);

  /**
   * O arquivo vai por requisição direta à API REST do Storage, e não pelo SDK.
   * Motivo: o SDK falhava com 'storage/unknown' + HTTP 400 no mobile sem expor
   * a resposta do servidor, tornando o problema indiagnosticável. Com XHR
   * mantemos o progresso do upload e conseguimos ler o corpo do erro.
   */
  private readonly bucket = firebaseConfig.storageBucket;
  private readonly apiStorage = 'https://firebasestorage.googleapis.com/v0/b';

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

    // Lê TODO o conteúdo para memória antes de qualquer outra coisa. Enviar o
    // `File` direto era o defeito: o blob podia ser desanexado entre a seleção
    // e o envio, e o upload ia com corpo vazio criando um objeto de 0 byte sem
    // erro nenhum. Com o buffer em mãos, o conteúdo não depende mais do input.
    let conteudo: ArrayBuffer;
    try {
      conteudo = await arquivo.arrayBuffer();
    } catch {
      throw new Error('Não foi possível ler o arquivo. Selecione-o novamente.');
    }
    if (conteudo.byteLength === 0 || conteudo.byteLength !== arquivo.size) {
      throw new Error(
        `Leitura do arquivo incompleta (${conteudo.byteLength} de ${arquivo.size} bytes). Selecione-o novamente.`
      );
    }

    // Prefixo com timestamp evita colisão entre arquivos de mesmo nome
    const nomeSeguro = this.sanitizarNomeArquivo(arquivo.name);
    const caminho = `relatorio-anexos/${idRelatorio}/${Date.now()}_${nomeSeguro}`;

    const url = await this.uploadViaRest(
      caminho,
      conteudo,
      arquivo.type || 'application/octet-stream',
      arquivo.size,
      onProgresso
    );
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
        await this.excluirArquivo(caminho);
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
        await this.excluirArquivo(anexo.caminho);
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

  /**
   * Envia o arquivo por XHR direto à API REST do Storage e devolve a URL de
   * download. Usa XHR (não fetch) porque só ele expõe progresso de upload.
   * Em caso de falha, a mensagem carrega o status e o corpo da resposta.
   */
  private uploadViaRest(
    caminho: string,
    conteudo: ArrayBuffer,
    contentType: string,
    tamanhoEsperado: number,
    onProgresso?: (p: ProgressoUpload) => void
  ): Promise<string> {
    const endpoint =
      `${this.apiStorage}/${this.bucket}/o?uploadType=media&name=${encodeURIComponent(caminho)}`;

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.onprogress = evento => {
        if (evento.lengthComputable) {
          const pct = Math.round((evento.loaded / evento.total) * 100);
          onProgresso?.({ percentual: pct, concluido: false });
        }
      };

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(this.mensagemDeFalha(xhr.status, xhr.responseText)));
          return;
        }
        try {
          const corpo = JSON.parse(xhr.responseText || '{}');

          // Rede de segurança: confere o que o servidor realmente gravou. Sem
          // isso, um corpo vazio cria objeto de 0 byte e nós salvaríamos
          // metadados apontando para um arquivo inútil.
          const gravado = Number(corpo.size);
          if (!Number.isFinite(gravado) || gravado !== tamanhoEsperado) {
            this.excluirArquivo(caminho);
            reject(new Error(
              `O servidor gravou ${gravado || 0} de ${tamanhoEsperado} bytes. Envio descartado, tente novamente.`
            ));
            return;
          }

          const token = (corpo.downloadTokens || '').split(',')[0];
          if (!token) {
            reject(new Error('Upload concluído, mas o servidor não devolveu o token de download.'));
            return;
          }
          resolve(
            `${this.apiStorage}/${this.bucket}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`
          );
        } catch {
          reject(new Error('Upload concluído, mas a resposta do servidor não pôde ser interpretada.'));
        }
      };

      xhr.onerror = () => reject(new Error('Falha de rede ao enviar o arquivo.'));
      xhr.ontimeout = () => reject(new Error('Tempo esgotado ao enviar o arquivo.'));

      xhr.send(conteudo);
    });
  }

  /**
   * Remove um objeto do Storage. Trata 404 como sucesso: o objetivo é que o
   * arquivo não exista mais, e ele já não existe.
   */
  private async excluirArquivo(caminho: string): Promise<void> {
    const endpoint = `${this.apiStorage}/${this.bucket}/o/${encodeURIComponent(caminho)}`;
    try {
      const resposta = await fetch(endpoint, { method: 'DELETE' });
      if (!resposta.ok && resposta.status !== 404) {
        console.error('Erro ao excluir arquivo do Storage:',
          this.mensagemDeFalha(resposta.status, await resposta.text()));
      }
    } catch (erro) {
      console.error('Falha de rede ao excluir arquivo do Storage:', erro);
    }
  }

  /** Extrai a mensagem real da resposta de erro do Storage */
  private mensagemDeFalha(status: number, corpo: string): string {
    let detalhe = (corpo || '').slice(0, 400);
    try {
      const json = JSON.parse(corpo);
      detalhe = json?.error?.message || detalhe;
    } catch { /* corpo não é JSON, usa o texto cru */ }
    return `HTTP ${status}${detalhe ? ' - ' + detalhe : ''}`;
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
