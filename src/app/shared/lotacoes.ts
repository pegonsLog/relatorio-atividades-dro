/**
 * Unidades organizacionais usadas como LOTAÇÃO do agente, ou seja, onde a
 * pessoa está alocada. É o mesmo conjunto da gerência do usuário.
 *
 * Não confundir com GERENCIAS (shared/gerencias.ts), que são as gerências
 * operacionais do relatório base: o agente não necessariamente trabalha para
 * a gerência onde está lotado, e por isso são dois atributos distintos.
 *
 * A lista serve como sugestão: o campo é texto livre, então valores fora
 * daqui continuam válidos e não são perdidos.
 */
export const LOTACOES: readonly string[] = [
  'AJU',
  'COESP',
  'COPES',
  'DPL',
  'DRO',
  'DSV',
  'GARBO',
  'GARNE',
  'GARNP',
  'GARVN',
  'GEACE',
  'GEAOP',
  'GEATU',
  'GEAUQ',
  'GECET',
  'GECOP',
  'GECOR',
  'GECOT',
  'GEDIV',
  'GEDUC',
  'GEITS',
  'GELOG',
  'GEMOB',
  'GEOPE',
  'GEPIN',
  'GEPRO',
  'GESEM',
  'GESIN',
  'GESIT',
  'GESPR',
  'GGBRT',
  'GPROM',
];
