/**
 * Fluxo do relatório:
 * - em_preenchimento: agente montando o relatório
 * - pendente: enviado, aguardando revisão do coordenador
 * - lido: revisado e aprovado pelo coordenador
 * - lido_pendente: revisado, mas o coordenador apontou uma pendência; o agente
 *   pode editar e reenviar para nova revisão (volta para 'pendente')
 */
export type StatusRelatorio = 'em_preenchimento' | 'pendente' | 'lido' | 'lido_pendente';

export interface RelatorioBase {
  idRelatorio?: string | number;
  gerencia: string;
  data: Date;
  diaSemana: string;
  turno: string;
  mat1: number;
  mat2: number;
  coord: number;
  superv: number;
  relatorioGeralDescritivo?: string;
  status?: StatusRelatorio;
  /** Descrição da pendência apontada pelo coordenador (status 'lido_pendente') */
  pendencia?: string;
  createdAt?: Date;
  updatedAt?: Date;
  criadoPor?: string;
  modificadoPor?: string;
}
