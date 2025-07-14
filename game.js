let currentDebugColor = null;
console.log("game.js loaded");

// --- Configuración del Canvas 2D ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Debug visual: Canvas azul al cargar game.js y canvas listo
currentDebugColor = 'blue';

// Ajustar el tamaño del canvas a la ventana
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Llamar al inicio para establecer el tamaño inicial

// --- Variables del Juego ---
const moveSpeed = 5; // Velocidad de avance por paso en píxeles
const stepDistance = 50; // Distancia en píxeles para un paso

let lastStepFingerId = -1;
const touchStartPositions = {};

// Posición actual de la cámara (simulada en 2D)
let cameraY = 0; // Usaremos Y para simular el avance en el camino

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
        // Debug visual: Canvas verde si ZingTouch está definido
        currentDebugColor = 'green';
        const region = new ZingTouch.Region(canvas); // Inicializar ZingTouch en el canvas

        // Gesto de Pan (deslizamiento) de dos dedos
        region.bind(canvas, 'pan', function(e) {
    console.log("ZingTouch Pan event detected!"); // Nuevo mensaje de depuración
    // Debug visual: Canvas rojo si se detecta Pan
    currentDebugColor = 'red';
    // Asegurarse de que sean dos toques
    if (e.detail.touches.length === 2) {
        const touch1 = e.detail.touches[0];
        const touch2 = e.detail.touches[1];

        // Lógica para detectar el paso alternado
        // Esto es una simplificación inicial, la lógica real será más compleja
        // Por ahora, cualquier deslizamiento de dos dedos activará un paso
        takeStep(touch1.identifier); // Usamos el ID del primer dedo como referencia
    }
}, { numInputs: 2 }); // Solo detectar con 2 dedos

        // Gesto de Tap (toque simple)
        region.bind(canvas, 'tap', function(e) {
            console.log("ZingTouch Tap event detected!");
            currentDebugColor = 'purple'; // Debug visual: Canvas morado si se detecta Tap
        });
    } else {
        console.error("ZingTouch is NOT defined. Touch events will not work.");
        // Debug visual: Canvas negro si ZingTouch NO está definido
        currentDebugColor = 'black';
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

    // Si hay un color de depuración, dibujarlo y salir
    if (currentDebugColor) {
        ctx.fillStyle = currentDebugColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(gameLoop);
        return; // Salir del bucle para no dibujar el juego normal
    }

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