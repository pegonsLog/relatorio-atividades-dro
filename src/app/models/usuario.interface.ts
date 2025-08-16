export interface Usuario {
  matricula: number;
  nome: string;
  senha: string;
  perfil: 'Admin' | 'Usuário';
  ativo: boolean;
}
