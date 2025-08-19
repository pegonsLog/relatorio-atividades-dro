export interface ItemAtividade {
  idAtividade: string | number;
  idRelatorio: string | number;
  item: number;
  acionamento: string;
  chegada: Date;
  solucao: Date | null;
  saida: Date;
  codAtv: number;
  codOcor: number;
  qtdAgentes: number;
  local: string;
  observacoes: string;
  data: Date;
}
