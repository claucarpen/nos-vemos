// El código de una juntada lo genera la base (`crear_juntada`): 128 bits aleatorios en base64url.
// Acá solo se reconoce la forma, para responder 404 sin consultar la base.
export const CODIGO_RE = /^[A-Za-z0-9_-]{22,64}$/;

export const esCodigo = (s: string | undefined): s is string => typeof s === 'string' && CODIGO_RE.test(s);
