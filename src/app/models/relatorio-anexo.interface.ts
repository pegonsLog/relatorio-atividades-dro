/**
 * Anexo de um relatório base: o arquivo em si fica no Cloud Storage e os
 * metadados nesta coleção do Firestore.
 */
export interface RelatorioAnexo {
  idAnexo?: string;
  /** Relatório ao qual o anexo pertence */
  idRelatorio: string;

  // --- Metadados editáveis pelo usuário (CRUD) ---
  nome: string;
  descricao: string;

  // --- Dados do arquivo (definidos no upload, não editáveis) ---
  /** Nome original do arquivo enviado */
  nomeArquivo: string;
  /** Content type, ex.: image/jpeg, application/pdf */
  tipo: string;
  /** Tamanho em bytes */
  tamanho: number;
  /** Caminho completo dentro do bucket, usado para excluir o arquivo */
  caminho: string;
  /** URL pública de download, usada para visualizar e exportar */
  url: string;

  // --- Auditoria ---
  createdAt?: Date;
  updatedAt?: Date;
  criadoPor?: string;
}
