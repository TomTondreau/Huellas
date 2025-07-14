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
const moveSpeed = 2.33; // Velocidad de avance por paso en píxeles (ajustada para simular 1.4 m/s a 60 FPS)
const stepDistance = 50; // Distancia en píxeles para un paso

// Constantes de conversión
const PIXELS_PER_METER = 100; // 100 píxeles = 1 metro
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

                // Contar pasos
                accumulatedMovementY += Math.abs(averageDeltaY); // Acumular el valor absoluto del movimiento
                if (accumulatedMovementY >= STEP_LENGTH_PIXELS) {
                    stepsCount++;
                    stepsDisplay.textContent = `🚶 Pasos: ${stepsCount}`;
                    accumulatedMovementY = 0; // Resetear el acumulador
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
            stepSpeedMultiplier = 0.5; // Slower on mud
            vibrationPattern = [100];
            break;
        case 'hielo':
            stepSpeedMultiplier = 1.5; // Faster on ice
            vibrationPattern = [20];
            break;
        case 'adoquin':
            stepSpeedMultiplier = 0.8; // Slightly slower on cobblestone
            vibrationPattern = [30, 20, 30];
            break;
        case 'tierra':
        default:
            stepSpeedMultiplier = 1.0; // Normal speed on dirt
            break;
    }

    if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
    }
    return stepSpeedMultiplier;
}

function getCurrentTerrainName(yPosition) {
    let currentTerrainName = 'tierra'; // Default
    let accumulatedLength = 0;
    const totalTerrainLength = terrainSegments.reduce((sum, seg) => sum + seg.length, 0);
    const effectiveY = yPosition % totalTerrainLength;

    for(let i = 0; i < terrainSegments.length; i++) {
        const segment = terrainSegments[i];
        accumulatedLength += segment.length;
        if (effectiveY < accumulatedLength) {
            currentTerrainName = segment.name;
            break;
        }
    }
    return currentTerrainName;
}

// --- Bucle de Dibujo y Actualización ---

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas

    // Mostrar la distancia en metros
    const distanceMeters = cameraY / PIXELS_PER_METER; // Convertir píxeles a metros
    distanceDisplay.textContent = `👣 Distancia: ${distanceMeters.toFixed(2)} m`;

    // Actualizar el terreno
    const currentTerrainName = getCurrentTerrainName(cameraY);
    terrainDisplay.textContent = `🏞️ Terreno: ${currentTerrainName.charAt(0).toUpperCase() + currentTerrainName.slice(1)}`;

    // Mostrar el tiempo transcurrido
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    timeDisplay.textContent = `⏱️ Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

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