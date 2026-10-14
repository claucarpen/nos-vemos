import { useState } from 'react';

// Isla React: solo maneja cuántas filas de fecha hay (2 a 10). El envío es un POST nativo a /nueva.
export type Inicial = { titulo: string; tamano: string; quorum: string; opciones: string[] };

type Props = { inicial: Inicial; min: string };

const MIN = 2;
const MAX = 10;

export default function CrearJuntadaForm({ inicial, min }: Props) {
  const [filas, setFilas] = useState(() => {
    const base = inicial.opciones.length >= MIN ? inicial.opciones : [...inicial.opciones, '', ''].slice(0, MIN);
    return base.map((valor, i) => ({ id: i, valor }));
  });
  const [siguiente, setSiguiente] = useState(filas.length);

  const agregar = () => {
    if (filas.length >= MAX) return;
    setFilas([...filas, { id: siguiente, valor: '' }]);
    setSiguiente(siguiente + 1);
  };
  const quitar = (id: number) => setFilas(filas.filter((f) => f.id !== id));
  const cambiar = (id: number, valor: string) => setFilas(filas.map((f) => (f.id === id ? { ...f, valor } : f)));

  return (
    <form method="post" className="crear">
      <label htmlFor="titulo">Título</label>
      <input id="titulo" name="titulo" type="text" required maxLength={80} defaultValue={inicial.titulo} placeholder="Cena del jueves" />

      <div className="crear-numeros">
        <div>
          <label htmlFor="tamano">Personas en el grupo</label>
          <input id="tamano" name="tamano" type="number" inputMode="numeric" required min={2} max={10} defaultValue={inicial.tamano} />
        </div>
        <div>
          <label htmlFor="quorum">Quórum</label>
          <input id="quorum" name="quorum" type="number" inputMode="numeric" required min={2} max={10} defaultValue={inicial.quorum} />
        </div>
      </div>
      <p className="ayuda">El quórum es cuántos tienen que poder el mismo día para que se cierre sola.</p>

      <fieldset>
        <legend>Fechas posibles (hora de Argentina)</legend>
        {filas.map((f, i) => (
          <div className="fecha-fila" key={f.id}>
            <label htmlFor={`opcion-${f.id}`} className="sr-only">Fecha {i + 1}</label>
            <input
              id={`opcion-${f.id}`} name="opcion" type="datetime-local" required min={min}
              value={f.valor} onChange={(e) => cambiar(f.id, e.target.value)}
            />
            {filas.length > MIN && (
              <button type="button" className="btn-quitar" onClick={() => quitar(f.id)} aria-label={`Quitar fecha ${i + 1}`}>✕</button>
            )}
          </div>
        ))}
        {filas.length < MAX && (
          <button type="button" className="btn-secundario btn-block" onClick={agregar}>+ Agregar fecha</button>
        )}
      </fieldset>

      <button type="submit" className="btn-start btn-block">Crear juntada</button>
    </form>
  );
}
