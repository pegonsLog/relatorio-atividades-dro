export interface Usuario {
  matricula: number;
  nome: string;
  senha: string;
  perfil: 'Admin' | 'Usuário Avançado' | 'Usuário';
  ativo: boolean;
  /**
   * Unidade onde o usuário está lotado. Equivale à gerência de lotação do
   * agente, e não às gerências operacionais do relatório base: o usuário nem
   * sempre trabalha para a gerência onde está lotado.
   */
  lotacao?: string;
}
