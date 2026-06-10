export interface Usuario {
  matricula: number;
  nome: string;
  senha: string;
  perfil: 'Admin' | 'Usuário Avançado' | 'Usuário';
  ativo: boolean;
}
