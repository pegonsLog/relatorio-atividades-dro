export type StatusRelatorio = 'em_preenchimento' | 'pendente' | 'lido';

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
  createdAt?: Date;
  updatedAt?: Date;
  criadoPor?: string;
  modificadoPor?: string;
}
