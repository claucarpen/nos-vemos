// Links de WhatsApp: solo abren WhatsApp con el texto armado; no envían nada solos.
import { formatearInicio } from './fechas';

const wa = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

export function textoCierre(titulo: string, inicio: string | Date, url: string): string {
  return `¡Nos vemos! ${titulo}: ${formatearInicio(inicio)}. Detalle: ${url}`;
}

// "Avisar al grupo por WhatsApp", cuando la juntada se cerró.
export function linkCierre(titulo: string, inicio: string | Date, url: string): string {
  return wa(textoCierre(titulo, inicio, url));
}

export function textoInvitacion(titulo: string, url: string): string {
  return `¡Armemos ${titulo}! Entrá y marcá qué días podés: ${url}`;
}

// "Invitar al grupo por WhatsApp", para el organizador mientras está abierta.
export function linkInvitacion(titulo: string, url: string): string {
  return wa(textoInvitacion(titulo, url));
}
