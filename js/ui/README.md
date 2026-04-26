# Controladores de Interfaz (UI)

Esta carpeta contiene los scripts principales que interactúan directamente con el usuario y el DOM (HTML).

- **`app.js`**: Controlador de `index.html`. Gestiona el canvas principal de dibujo, captura los trazos del mouse/dedo, pinta la interfaz y actúa como "Director de Orquesta" decidiendo si usar la API de Google (`online`) o los motores de respaldo (`offline`).
- **`learn.js`**: Controlador de `learn.html`. Gestiona el modo de aprendizaje guiado, mostrando las animaciones de trazado y validando si el niño dibujó correctamente sobre la línea punteada.
