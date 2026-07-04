## Pendiente por realizar

- [x] Pasar el estilo a Tailwind CSS
- [x] Reemplaza autentificacion a Firebase Auth (iniciar sesion con correo de Google)
- [x] Ver la opcion de base de datos semi estructurados como Mongo DB
- [x] las tarjetas se deben llamar tareas
- [x] Comparar las funcionalidades de tarea igual a Asana
- [x] Modificar la autentificacion de Feirebise, que se pueda crear usuario, con nombre de usuario y contrasena
- [x] Los boards y tareas se deden compartir entre los usuarios
- [x] Llevar la vista de bords parecida al asana
- [x] Asignar duenos a miembros
- [x] Actulizar vista de cuenta de usuario
- [ ] Mejorar el Home, hacerlo practico enfocado a las necesidades del equipo CRM
- [ ] Temas de las notificaciones por correo
- [ ] Dashboard para ver las analiticas de las tareas
- [ ] Realizar un QA manual de los estilos general

### Promt para 



Vercel Functions (Serverless)

Resend

[ROL] Experto en Backend (Firebase Cloud Functions / Vercel Functions) y servicios de email.



[CONTEXTO] Implementar sistema de notificaciones automáticas vía email cuando una tarea cambia a estado "finalizada".



[TAREAS]

1. Configuración de Servicio: Configurar un proveedor de correos (Resend ) para el envío.

2. Trigger de Firestore: Escribir una función (Serverless) que se ejecute cuando un documento de tarea sea actualizado a "finalizada".

3. Lógica de Notificación:

   - Identificar los miembros asociados a la tarea/board.

   - Construir una plantilla de correo profesional indicando qué tarea finalizó y quién fue el responsable.

4. Integración: Asegurar que la función tenga los permisos necesarios en Firebase para leer la data de los miembros y enviar la notificación.



[REGLAS]

- Ejecutar la escritura del código directamente.

- Corregir errores de importación de forma autónoma.

- Respetar directrices de "AGENT_RULES.md".



[SALIDA ESPERADA]

1. Confirmación de ejecución.

2. Código de la función de servidor y los pasos para configurar las variables de entorno en Vercel/Firebase.