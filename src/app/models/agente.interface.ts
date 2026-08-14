export interface Agente {
  matricula: number;
  nome: string;
  cargo: string;
  turno: string;
  /** Gerência onde o agente está lotado */
  gerencia: string;
}
