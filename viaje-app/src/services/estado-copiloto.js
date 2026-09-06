/** Evita que una pestaña antigua pise los borradores guardados en otra. */
export async function escribirEstado(fb, ref, mensajes, revision) {
  return fb.fs.runTransaction(fb.db, async (tx) => {
    const actual = await tx.get(ref)
    if ((actual.data()?.revision ?? 0) !== revision) throw new Error('conversacion-cambiada')
    tx.set(ref, { mensajes, revision: revision + 1, updatedAt: fb.fs.serverTimestamp() })
    return revision + 1
  })
}
