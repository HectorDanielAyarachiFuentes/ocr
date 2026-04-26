# Evolución del Motor Offline: "Stroke JSON Database"

## El Problema Actual
Actualmente el motor offline depende de Tesseract.js para adivinar el texto y de una librería propia de geometría (`geometry.js`) basada en la *Transformada de Distancia de Chamfer*. Aunque esto funciona muy bien para corregir a Tesseract, sigue operando sobre los "píxeles muertos" de la imagen estirada.

## El Plan Maestro (Siguiente Iteración)
Para hacer que el motor offline sea tan preciso como la API de Google, necesitamos dejar de mirar la imagen estática y empezar a analizar los vectores de movimiento `[x, y, tiempo]`.

### ¿Cómo funcionará?
1. **Base de Datos en JSON:** Crearemos un archivo estático (ej. `stroke_db.json`) que contendrá el patrón de movimiento ideal (secuencia de trazos) para cada letra del abecedario.
2. **Captura Constante:** `app.js` ya está grabando el trazo del usuario en el array `strokes`.
3. **Comparación Dinámica (Dynamic Time Warping - DTW):** Al finalizar el dibujo, el motor offline comparará la ruta exacta del dedo del usuario contra los patrones del JSON usando el algoritmo DTW. 
4. **Cero Adivinanzas:** El sistema ya no intentará interpretar "manchas" (lo cual causa falsos positivos). Solo buscará la silueta temporal que más se asemeje al ritmo y dirección con el que se dibujó la letra.

Esto garantizará que el tutor funcione al 100% de forma offline con una precisión quirúrgica, rechazando inmediatamente dibujos sin sentido o "garabatos" infantiles que Tesseract intentaría convertir en letras.
