# Goniómetro Wild T-20 — recurso didáctico

Recurso web responsive para la familiarización con el goniómetro Wild T-20.

## Contenido

1. Generalidades, características y empleo.
2. Descripción interactiva de los componentes.
3. Galería de vistas generales del aparato.
4. Práctica de puntería y lectura de limbos, pendiente de adaptación al sistema de lectura del T-20.

La nivelación y el manejo básico de la brújula no se desarrollan como apartados independientes, ya que son procedimientos comunes a otros aparatos y no se dispone de contenido específico adicional para este recurso.

## Estructura

- `index.html`: recurso principal y estructura de contenidos.
- `app.js`: componentes, descripciones y funcionamiento del visor interactivo.
- `styles.css`: diseño responsive de la aplicación.
- `assets/images/nuevas/`: vistas generales y fotografías de detalle del T-20.
- `assets/videos/`: material audiovisual, cuando proceda.
- `practica/`: simulador y ejercicios de observación y lectura; actualmente pendientes de adaptación al visor del T-20.

## Imágenes previstas

Las cinco vistas generales deben conservar estos nombres para evitar modificar las rutas del código:

- `vista_frontal.jpg`
- `vista_posterior.jpg`
- `vista_lateral_derecha.jpg`
- `vista_lateral_izquierda.jpg`
- `vista_oblicua.jpg`

Las fotografías de detalle utilizadas por `app.js` se almacenan también en `assets/images/nuevas/`.

## Publicación

El proyecto está preparado para publicarse como sitio estático mediante GitHub Pages y para enlazarse o integrarse como recurso externo en Moodle.
