// Lógica de merge por id extraída de apiSaveReqs (index.html línea 55).
// NO modificar index.html.
//
// Regla: dada una lista remota y una lista local, ambas con items {id,...},
// los items locales sobrescriben a los remotos con el mismo id; el resultado
// preserva el orden en el que se encontraron los ids (primero remotos, luego
// nuevos locales). Items sin id se ignoran.

export function mergeReqsById(remote, local) {
  const byId = new Map();
  (Array.isArray(remote) ? remote : []).forEach((x) => {
    if (x && x.id) byId.set(x.id, x);
  });
  (Array.isArray(local) ? local : []).forEach((x) => {
    if (x && x.id) byId.set(x.id, x);
  });
  return Array.from(byId.values());
}
