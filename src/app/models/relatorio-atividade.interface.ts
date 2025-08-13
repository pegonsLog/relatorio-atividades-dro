export interface RelatorioAtividade {
  idAtividade: number;
  idRelatorio: number;
  item: number;
  acionamento: string;
  chegada: Date;
  solucao: Date;
  saida: Date;
  codAtv: number;
  codOcor: number;
  qtdAgentes: number;
  local: string;
  observacoes: string;
}
