/**
 * Quien puede tocar una nota.
 *
 * Espeja las reglas de Firestore, y esa es toda su razon de ser: un boton que
 * el servidor va a rechazar deja a la persona mirando un error que no
 * entiende. Es regla escrita del proyecto desde agosto —«las cerraduras de la
 * interfaz espejan las de Firestore»— y aqui esta la mitad de la interfaz.
 *
 * Puro y minusculo a proposito: se puede leer al lado de `firestore.rules` y
 * comprobar de un vistazo que dicen lo mismo. Hay una prueba que lo compara.
 */

/** Editar es solo de quien la escribio. Corregir a otro es hablar por el. */
export function puedeEditarNota(nota, uid) {
  return Boolean(uid) && nota?.authorUid === uid
}

/**
 * Borrar, ademas, de quien organiza.
 *
 * No es un privilegio simetrico por descuido: alguien tiene que poder limpiar
 * una nota que sobra cuando su autor no esta mirando, pero nadie deberia
 * poder reescribir lo que dijo otro.
 */
export function puedeBorrarNota(nota, { uid = null, esOwner = false } = {}) {
  return puedeEditarNota(nota, uid) || Boolean(esOwner)
}
