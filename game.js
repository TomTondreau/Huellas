console.log("game.js loaded");

// --- Configuración del Canvas 2D ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Referencias a los elementos de la UI
const distanceDisplay = document.getElementById('distanceDisplay');
const terrainDisplay = document.getElementById('terrainDisplay');
const instructionsDisplay = document.getElementById('instructionsDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const stepsDisplay = document.getElementById('stepsDisplay');

// Ajustar el tamaño del canvas a la ventana
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Llamar al inicio para establecer el tamaño inicial

// --- Variables del Juego ---
// Constantes de conversión
const PIXELS_PER_METER = 500; // 500 píxeles = 1 metro (ajustado para mayor dificultad y realismo)
const FPS = 60; // Asumiendo 60 fotogramas por segundo
const STEP_LENGTH_METERS = 0.7; // Longitud de un paso humano en metros
const STEP_LENGTH_PIXELS = STEP_LENGTH_METERS * PIXELS_PER_METER; // Longitud de un paso en píxeles

let lastStepFingerId = -1;
const touchStartPositions = {};

// Posición actual de la cámara (simulada en 2D)
let cameraY = 0; // Usaremos Y para simular el avance en el camino
let lastCameraY = 0; // Para calcular la velocidad

let startTime = Date.now(); // Tiempo de inicio del juego
let stepsCount = 0; // Contador de pasos

// Definición de los segmentos de terreno (color y longitud)
const terrainSegments = [
    { name: 'tierra', color: '#D2691E', length: 1600 }, // Ocre/Marrón de Firewatch
    { name: 'lodo', color: '#8B4513', length: 1600 },   // Marrón oscuro de Firewatch
    { name: 'hielo', color: '#A4D8F0', length: 1600 },  // Azul claro inspirado en la paleta
    { name: 'adoquin', color: '#696969', length: 1600 } // Gris urbano de Firewatch
];


// --- Lógica de Control Táctil (con ZingTouch) ---
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ZingTouch !== 'undefined') {
        console.log("ZingTouch is defined. Initializing region.");
        const region = new ZingTouch.Region(canvas); // Inicializar ZingTouch en el canvas

        

        // Gesto de Tap (toque simple)
        region.bind(canvas, 'tap', function(e) {
        });

        // Depuración de eventos táctiles nativos
        let initialTouch1 = null;
        let initialTouch2 = null;
        let accumulatedMovementY = 0; // Acumulador para contar pasos

        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault(); // Prevenir el comportamiento por defecto del navegador
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
                const deltaY1 = currentTouch1.y - initialTouch1.y;
                const deltaY2 = currentTouch2.y - initialTouch2.y;

                // Actualizar el terreno y la vibración
                const stepSpeedMultiplier = takeStep();

                // Mover la cámara basándose en el promedio del movimiento vertical de los dedos
                const averageDeltaY = (deltaY1 + deltaY2) / 2;
                cameraY += averageDeltaY * stepSpeedMultiplier; // Sumar porque el movimiento hacia abajo de los dedos significa avanzar en el juego

                // Contar pasos y añadir huellas
                accumulatedMovementY += Math.abs(averageDeltaY); // Acumular el valor absoluto del movimiento
                if (accumulatedMovementY >= STEP_LENGTH_PIXELS) {
                    stepsCount++;
                    stepsDisplay.textContent = `🚶 Pasos: ${stepsCount}`;
                    accumulatedMovementY = 0; // Resetear el acumulador

                    // Añadir una nueva huella en la posición de uno de los dedos
                    const touchForFootprint = e.touches[0]; // Usar el primer dedo para la posición
                    footprints.push({
                        x: touchForFootprint.clientX,
                        y: touchForFootprint.clientY,
                        opacity: 1.0,
                        rotation: Math.random() * 0.2 - 0.1 // Pequeña rotación aleatoria
                    });
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

function takeStep() {
    let currentTerrainName = getCurrentTerrainName(cameraY);
    let vibrationPattern = [50];
    let stepSpeedMultiplier = 1.0; // Default speed multiplier

    switch (currentTerrainName) {
        case 'lodo':
            stepSpeedMultiplier = 0.1; // Very difficult on mud
            vibrationPattern = [100];
            break;
        case 'hielo':
            stepSpeedMultiplier = 0.7; // More difficult on ice
            vibrationPattern = [20];
            break;
        case 'adoquin':
            stepSpeedMultiplier = 0.3; // More difficult on cobblestone
            vibrationPattern = [30, 20, 30];
            break;
        case 'tierra':
        default:
            stepSpeedMultiplier = 0.5; // More difficult on dirt
            break;
    }

    if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
    }
    return stepSpeedMultiplier;
}

function getTerrainSegmentAt(yPosition) {
    let accumulatedLength = 0;
    const totalTerrainLength = terrainSegments.reduce((sum, seg) => sum + seg.length, 0);
    // Evitar el módulo de cero si la longitud total es 0
    const effectiveY = totalTerrainLength > 0 ? yPosition % totalTerrainLength : 0;

    for(const segment of terrainSegments) {
        accumulatedLength += segment.length;
        if (effectiveY < accumulatedLength) {
            return segment;
        }
    }
    return terrainSegments[0] || { name: 'default', color: '#000' }; // Default
}

// --- Bucle de Dibujo y Actualización ---

let footprints = []; // Array para almacenar las huellas

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas

    // Mostrar la distancia en metros
    const distanceMeters = cameraY / PIXELS_PER_METER; // Convertir píxeles a metros
    distanceDisplay.textContent = `👣 Distancia: ${distanceMeters.toFixed(2)} m`;

    // Actualizar el terreno
    const currentTerrain = getTerrainSegmentAt(cameraY);
    terrainDisplay.textContent = `🏞️ Terreno: ${currentTerrain.name.charAt(0).toUpperCase() + currentTerrain.name.slice(1)}`;

    // Mostrar el tiempo transcurrido
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    timeDisplay.textContent = `⏱️ Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Dibujar el cielo (degradado inspirado en Firewatch)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#F7931E'); // Naranja cálido superior
    gradient.addColorStop(1, '#FF6B35'); // Naranja cálido inferior
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar los segmentos de terreno (Lógica corregida)
    // El jugador está en la parte inferior de la pantalla (y=canvas.height).
    // Dibujamos el mundo desde la posición de la cámara hacia adelante (hacia y=0).
    let world_y_start = cameraY;
    let screen_y_start = canvas.height;

    while (screen_y_start > 0) {
        const segment = getTerrainSegmentAt(world_y_start);
        const totalTerrainLength = terrainSegments.reduce((sum, seg) => sum + seg.length, 0);
        const world_y_effective = totalTerrainLength > 0 ? world_y_start % totalTerrainLength : 0;

        let segment_start_y = 0;
        for(const s of terrainSegments) {
            if (s.name === segment.name) break;
            segment_start_y += s.length;
        }

        const distance_into_segment = world_y_effective - segment_start_y;
        const remaining_in_segment = segment.length - distance_into_segment;

        const draw_height = Math.min(screen_y_start, remaining_in_segment);

        ctx.fillStyle = segment.color;
        ctx.fillRect(0, screen_y_start - draw_height, canvas.width, draw_height);

        screen_y_start -= draw_height;
        world_y_start += draw_height;
    }

    // Dibujar y actualizar huellas
    footprints.forEach((footprint, index) => {
        footprint.opacity -= 0.01; // Reducir la opacidad
        if (footprint.opacity <= 0) {
            footprints.splice(index, 1); // Eliminar la huella si es invisible
        } else {
            drawFootprint(footprint);
        }
    });

    requestAnimationFrame(gameLoop);
}

// Función para dibujar una huella simple
function drawFootprint(footprint) {
    ctx.fillStyle = `rgba(0, 0, 0, ${footprint.opacity * 0.2})`; // Color oscuro semitransparente
    // Dibuja una forma simple de huella (dos óvalos)
    ctx.beginPath();
    ctx.ellipse(footprint.x, footprint.y, 10, 20, footprint.rotation, 0, 2 * Math.PI); // Suela
    ctx.ellipse(footprint.x + Math.sin(footprint.rotation) * 20, footprint.y - Math.cos(footprint.rotation) * 20, 15, 12, footprint.rotation, 0, 2 * Math.PI); // Dedos
    ctx.fill();
}

gameLoop();
