// Traduce los mensajes-clave que lanzan las funciones de `002_juntadas.sql` a texto para la persona.
const TEXTOS: Record<string, string> = {
  sin_sesion: 'Tu sesión se venció. Entrá con Google de nuevo.',
  titulo_invalido: 'El título tiene que tener entre 1 y 80 caracteres.',
  tamano_invalido: 'El grupo tiene que ser de 2 a 10 personas.',
  quorum_invalido: 'El quórum va de 2 a 10 y no puede ser mayor que el grupo.',
  cantidad_opciones: 'Proponé entre 2 y 10 fechas.',
  opcion_pasada: 'Todas las fechas tienen que ser futuras.',
  opciones_repetidas: 'Hay fechas repetidas.',
  fecha_invalida: 'Revisá las fechas: alguna no es válida.',
  no_existe: 'Esta juntada no existe.',
  juntada_no_abierta: 'La juntada ya no está abierta.',
  juntada_llena: 'La juntada ya tiene 10 participantes.',
  no_participante: 'No estás en esta juntada.',
  opcion_ajena: 'Esa fecha no es de esta juntada.',
  no_organizador: 'Solo quien organiza puede cancelar.',
  login: 'No pudimos entrar con Google. Probá de nuevo.',
};

export const ERROR_GENERICO = 'GAME OVER… algo falló. Probá de nuevo.';

export function claveDeError(error: { message?: string } | null | undefined): string | null {
  const m = error?.message ?? '';
  return Object.hasOwn(TEXTOS, m) ? m : null;
}

export function textoDeError(error: { message?: string } | null | undefined): string {
  const clave = claveDeError(error);
  return clave ? TEXTOS[clave] : ERROR_GENERICO;
}
