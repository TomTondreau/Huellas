let currentDebugColor = null;
console.log("game.js loaded");

// --- Configuración del Canvas 2D ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Referencias a los elementos de la UI
const distanceDisplay = document.getElementById('distanceDisplay');
const speedDisplay = document.getElementById('speedDisplay');
const terrainDisplay = document.getElementById('terrainDisplay');
const instructionsDisplay = document.getElementById('instructionsDisplay');

// Ajustar el tamaño del canvas a la ventana
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Llamar al inicio para establecer el tamaño inicial

// --- Variables del Juego ---
const moveSpeed = 2.33; // Velocidad de avance por paso en píxeles (ajustada para simular 1.4 m/s a 60 FPS)
const stepDistance = 50; // Distancia en píxeles para un paso

// Constantes de conversión
const PIXELS_PER_METER = 100; // 100 píxeles = 1 metro
const FPS = 60; // Asumiendo 60 fotogramas por segundo

let lastStepFingerId = -1;
const touchStartPositions = {};

// Posición actual de la cámara (simulada en 2D)
let cameraY = 0; // Usaremos Y para simular el avance en el camino
let lastCameraY = 0; // Para calcular la velocidad
let currentSpeed = 0; // Velocidad actual

// Definición de los segmentos de terreno (color y longitud)
const terrainSegments = [
    { name: 'tierra', color: '#966939', length: 800 },
    { name: 'lodo', color: '#5C4033', length: 800 },
    { name: 'hielo', color: '#FFFFFF', length: 800 },
    { name: 'adoquin', color: '#505050', length: 800 }
];


// --- Lógica de Control Táctil (con ZingTouch) ---
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ZingTouch !== 'undefined') {
        console.log("ZingTouch is defined. Initializing region.");
        const region = new ZingTouch.Region(canvas); // Inicializar ZingTouch en el canvas

        

        // Gesto de Tap (toque simple)
        region.bind(canvas, 'tap', function(e) {
            console.log("ZingTouch Tap event detected!");
        });

        // Depuración de eventos táctiles nativos
        let initialTouch1 = null;
        let initialTouch2 = null;

        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault(); // Prevenir el comportamiento por defecto del navegador
                console.log("Native touchstart with 2 fingers detected!");
                initialTouch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: e.touches[0].identifier };
                initialTouch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY, id: e.touches[1].identifier };
            }
        });

        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && initialTouch1 && initialTouch2) {
                e.preventDefault(); // Prevenir el comportamiento por defecto del navegador
                const currentTouch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: e.touches[0].identifier };
                const currentTouch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY, id: e.touches[1].identifier };

                // Calcular el desplazamiento de cada dedo
                const deltaX1 = currentTouch1.x - initialTouch1.x;
                const deltaY1 = currentTouch1.y - initialTouch1.y;
                const deltaX2 = currentTouch2.x - initialTouch2.x;
                const deltaY2 = currentTouch2.y - initialTouch2.y;

                // Considerar un "pan" si ambos dedos se han movido significativamente en la misma dirección general
                // Puedes ajustar este umbral de movimiento (por ejemplo, 10 píxeles)
                const moveThreshold = 10;
                if (Math.abs(deltaY1) > moveThreshold && Math.abs(deltaY2) > moveThreshold &&
                    Math.sign(deltaY1) === Math.sign(deltaY2)) { // Ambos se mueven en la misma dirección Y
                    console.log("Native pan event detected!");
                    // Aquí puedes llamar a takeStep o tu lógica de movimiento
                    // Por ahora, solo cambiamos el color para depuración
                    takeStep(currentTouch1.id); // Usamos el ID del primer dedo como referencia para takeStep
                } else {
                    // Dos dedos moviéndose, pero no un "pan" aún
                }
            }
        });

        canvas.addEventListener('touchend', function(e) {
            // Resetear las posiciones iniciales cuando los dedos se levantan
            initialTouch1 = null;
            initialTouch2 = null;
            // Opcional: resetear el color de depuración o volver al estado normal del juego
            // currentDebugColor = 'green'; // O el color inicial de ZingTouch
        });
    } else {
        console.error("ZingTouch is NOT defined. Touch events will not work.");
    }
});

function takeStep(fingerId) {
    let currentTerrainName = 'tierra'; // Por defecto
    // Determinar el terreno actual basado en cameraY
    let totalLength = 0;
    for(let i = 0; i < terrainSegments.length; i++) {
        totalLength += terrainSegments[i].length;
        if (cameraY % totalLength < totalLength - terrainSegments[i].length) {
            currentTerrainName = terrainSegments[i].name;
            break;
        }
    }

    let stepSpeed = moveSpeed;
    let vibrationPattern = [50];

    terrainDisplay.textContent = `Terreno: ${currentTerrainName.charAt(0).toUpperCase() + currentTerrainName.slice(1)}`;

    switch (currentTerrainName) {
        case 'lodo':
            stepSpeed *= 0.7;
            vibrationPattern = [100];
            break;
        case 'hielo':
            stepSpeed *= 1.5;
            vibrationPattern = [20];
            break;
        case 'adoquin':
            stepSpeed *= 1.0;
            vibrationPattern = [30, 20, 30];
            break;
        case 'tierra':
        default:
            break;
    }

    cameraY += stepSpeed; // Mover la cámara

    lastStepFingerId = fingerId;

    if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
    }
}

// --- Bucle de Dibujo y Actualización ---

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas

    // Calcular y mostrar la velocidad
    const distanceCoveredPx = cameraY - lastCameraY; // Distancia recorrida en este frame en píxeles
    const distanceCoveredMeters = distanceCoveredPx / PIXELS_PER_METER; // Distancia en metros
    const speedMps = distanceCoveredMeters * FPS; // Velocidad en metros por segundo
    speedDisplay.textContent = `Velocidad: ${speedMps.toFixed(2)} m/s`;
    lastCameraY = cameraY;

    // Mostrar la distancia en kilómetros
    const distanceKm = cameraY / PIXELS_PER_METER / 1000; // Convertir píxeles a kilómetros
    distanceDisplay.textContent = `Distancia: ${distanceKm.toFixed(3)} km`;

    // Dibujar el cielo (degradado)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#fab77a'); // Color superior (atardecer)
    gradient.addColorStop(1, '#ff8c00'); // Color inferior (horizonte)
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar los segmentos de terreno
    let currentY = canvas.height; // Empezar a dibujar desde la parte inferior
    let segmentOffset = cameraY % (terrainSegments.reduce((sum, seg) => sum + seg.length, 0));

    for (let i = 0; i < terrainSegments.length; i++) {
        const segment = terrainSegments[i];
        ctx.fillStyle = segment.color;
        
        // Calcular la posición y altura del segmento en la pantalla
        let segmentHeight = segment.length;
        let drawY = currentY - segmentHeight + segmentOffset;

        // Asegurarse de que el segmento esté visible en la pantalla
        if (drawY < canvas.height && drawY + segmentHeight > 0) {
            ctx.fillRect(0, drawY, canvas.width, segmentHeight);
        }
        currentY -= segment.length;
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();