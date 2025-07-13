// --- Configuración del Canvas 2D ---
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

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

// --- Lógica de Control Táctil ---
document.addEventListener('touchstart', (event) => {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        touchStartPositions[touch.identifier] = touch.clientY;
    }
});

document.addEventListener('touchmove', (event) => {
    event.preventDefault(); // Prevenir el scroll del navegador

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        if (touch.identifier !== lastStepFingerId) {
            const startY = touchStartPositions[touch.identifier];
            const currentY = touch.clientY;
            const swipeDistance = startY - currentY; // Invertido porque Y crece hacia abajo

            if (swipeDistance > stepDistance) {
                takeStep(touch.identifier);
            }
        }
    }
}, { passive: false });

document.addEventListener('touchend', (event) => {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        if (touch.identifier === lastStepFingerId) {
            lastStepFingerId = -1;
        }
        delete touchStartPositions[touch.identifier];
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