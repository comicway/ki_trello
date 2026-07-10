export const filterTareasByCountry = (tareasByList, countryCode) => {
  if (!countryCode) return tareasByList || [];

  return (tareasByList || []).map(({ listKey, tareas }) => ({
    listKey,
    tareas: (tareas || []).filter((tarea) => tarea.country === countryCode),
  }));
};
