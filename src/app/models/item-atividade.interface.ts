export interface ItemAtividade {
  idAtividade: string | number;
  idRelatorio: string | number;
  item: number;
  acionamento: string;
  chegada: Date;
  solucao: Date | null;
  saida: Date;
  codAtv: number;
  nomeAtividade: string;
  qtdAgentes: number;
  local: string;
  observacoes: string;
  data: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
