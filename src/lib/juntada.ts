// Forma de lo que devuelve `detalle_juntada` y cálculos de la pantalla de votación.

export type Estado = 'abierta' | 'cerrada' | 'cancelada';

export type Opcion = { id: string; inicio: string; votos: number; mia: boolean };
export type Participante = { numero: number; nombre: string; voto: boolean; soy_yo: boolean };

export type Detalle = {
  codigo: string;
  titulo: string;
  estado: Estado;
  quorum: number;
  tamano_grupo: number;
  maximo: number;
  organizador: string;
  soy_organizador: boolean;
  yo_vote: boolean;
  opcion_ganadora_id: string | null;
  opciones: Opcion[];
  participantes: Participante[];
};

export type Publica = { titulo: string; organizador: string; estado: Estado };

// Cuántos votos le faltan a la opción más votada para llegar al quórum.
export function faltanParaQuorum(d: Pick<Detalle, 'quorum' | 'opciones'>): number {
  const max = Math.max(0, ...d.opciones.map((o) => o.votos));
  return Math.max(0, d.quorum - max);
}
