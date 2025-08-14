

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
const PIXELS_PER_METER = 500;
const STEP_LENGTH_METERS = 0.7;
const STEP_LENGTH_PIXELS = STEP_LENGTH_METERS * PIXELS_PER_METER;

let cameraY = 0;
let startTime = Date.now();
let stepsCount = 0;
let footprints = [];

const terrainSegments = [
    { name: 'tierra', color: '#D2691E', length: 100 }, // Prueba: Segmento muy corto
    { name: 'lodo', color: '#8B4513', length: 100 },   // Prueba: Segmento muy corto
    { name: 'hielo', color: '#A4D8F0', length: 100 },  // Prueba: Segmento muy corto
    { name: 'adoquin', color: '#696969', length: 100 } // Prueba: Segmento muy corto
];

// --- Lógica de Control Táctil ---
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ZingTouch !== 'undefined') {
        let initialTouch1 = null;
        let initialTouch2 = null;
        let accumulatedMovementY = 0;

        // --- Soporte para Mouse/Trackpad ---
        let isMouseDown = false;
        let lastMouseY = 0;

        canvas.addEventListener('mousedown', function(e) {
            isMouseDown = true;
            lastMouseY = e.clientY;
            e.preventDefault();
        });

        canvas.addEventListener('mousemove', function(e) {
            if (isMouseDown) {
                e.preventDefault();
                const deltaY = e.clientY - lastMouseY;
                lastMouseY = e.clientY;

                const stepSpeedMultiplier = takeStep();
                // Simulamos el "averageDeltaY" del modo táctil
                const averageDeltaY = deltaY;
                cameraY += averageDeltaY * stepSpeedMultiplier;

                accumulatedMovementY += Math.abs(averageDeltaY);
                if (accumulatedMovementY >= STEP_LENGTH_PIXELS) {
                    stepsCount++;
                    stepsDisplay.textContent = `🚶 Pasos: ${stepsCount}`;
                    accumulatedMovementY = 0;

                    footprints.push({
                        x: e.clientX,
                        y: e.clientY,
                        opacity: 1.0,
                        rotation: Math.random() * 0.2 - 0.1
                    });
                }
            }
        });

        canvas.addEventListener('mouseup', function(e) {
            isMouseDown = false;
        });

        canvas.addEventListener('mouseleave', function(e) {
            isMouseDown = false;
        });

        // --- Soporte Táctil Original ---
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                initialTouch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: e.touches[0].identifier };
                initialTouch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY, id: e.touches[1].identifier };
            }
        });

        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && initialTouch1 && initialTouch2) {
                e.preventDefault();
                const currentTouch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: e.touches[0].identifier };
                const currentTouch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY, id: e.touches[1].identifier };

                const deltaY1 = currentTouch1.y - initialTouch1.y;
                const deltaY2 = currentTouch2.y - initialTouch2.y;

                const stepSpeedMultiplier = takeStep();
                const averageDeltaY = (deltaY1 + deltaY2) / 2;
                cameraY += averageDeltaY * stepSpeedMultiplier;

                accumulatedMovementY += Math.abs(averageDeltaY);
                if (accumulatedMovementY >= STEP_LENGTH_PIXELS) {
                    stepsCount++;
                    stepsDisplay.textContent = `🚶 Pasos: ${stepsCount}`;
                    accumulatedMovementY = 0;

                    const touchForFootprint = e.touches[0];
                    footprints.push({
                        x: touchForFootprint.clientX,
                        y: touchForFootprint.clientY,
                        opacity: 1.0,
                        rotation: Math.random() * 0.2 - 0.1
                    });
                }
            }
        });

        canvas.addEventListener('touchend', function(e) {
            initialTouch1 = null;
            initialTouch2 = null;
        });
    } else {
        console.error("ZingTouch is NOT defined. Touch events will not work.");
    }
});

function takeStep() {
    const currentTerrain = getTerrainSegmentAt(cameraY);
    const currentTerrainName = currentTerrain.name;
    let vibrationPattern = [50];
    let stepSpeedMultiplier = 1.0;

    switch (currentTerrainName) {
        case 'lodo':
            stepSpeedMultiplier = 0.1;
            vibrationPattern = [100];
            break;
        case 'hielo':
            stepSpeedMultiplier = 0.7;
            vibrationPattern = [20];
            break;
        case 'adoquin':
            stepSpeedMultiplier = 0.3;
            vibrationPattern = [30, 20, 30];
            break;
        case 'tierra':
        default:
            stepSpeedMultiplier = 0.5;
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
    const effectiveY = totalTerrainLength > 0 ? yPosition % totalTerrainLength : 0;

    for(const segment of terrainSegments) {
        accumulatedLength += segment.length;
        if (effectiveY < accumulatedLength) {
            return segment;
        }
    }
    return terrainSegments[0] || { name: 'default', color: '#000' };
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Definir Horizonte ---
    const horizonY = canvas.height * 0.4;

    // --- Dibujado ---
    // 1. Dibujar el cielo
    const gradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    gradient.addColorStop(0, '#F7931E');
    gradient.addColorStop(1, '#FF6B35');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, horizonY);

    // 2. Dibujar Silueta de Montañas (placeholder)
    ctx.fillStyle = '#4a2e1a'; // Un color oscuro para la silueta
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(canvas.width * 0.2, horizonY * 0.8);
    ctx.lineTo(canvas.width * 0.4, horizonY);
    ctx.lineTo(canvas.width * 0.6, horizonY * 0.7);
    ctx.lineTo(canvas.width * 0.8, horizonY);
    ctx.lineTo(canvas.width, horizonY * 0.9);
    ctx.lineTo(canvas.width, horizonY);
    ctx.closePath();
    ctx.fill();

    // 3. Dibujar el suelo con perspectiva (Lógica corregida)
    // Iteramos desde el horizonte hacia abajo (y_from_horizon = 0 a canvas.height - horizonY)
    for (let y_from_horizon = 0; y_from_horizon < canvas.height - horizonY; y_from_horizon++) {
        // Calcular la distancia en el mundo del juego para esta línea de la pantalla
        // Las líneas más cercanas al horizonte (y_from_horizon pequeño) representan distancias grandes
        // Las líneas más cercanas al jugador (y_from_horizon grande) representan distancias pequeñas
        // Usamos una función inversa para la perspectiva
        const world_z_distance = (canvas.height - horizonY) - y_from_horizon;
        const distance_in_world = (10000 / (world_z_distance + 1)); // 10000 es un factor de escala para la perspectiva
        
        // La posición en el mundo a muestrear es la posición del jugador + la distancia
        const worldY_to_sample = cameraY + distance_in_world;

        const segment = getTerrainSegmentAt(worldY_to_sample);
        ctx.fillStyle = segment.color;
        ctx.fillRect(0, horizonY + y_from_horizon, canvas.width, 1);
    }

    // --- UI Updates (se mantienen igual) ---
    const distanceMeters = Math.abs(cameraY / PIXELS_PER_METER);
    distanceDisplay.textContent = `👣 Distancia: ${distanceMeters.toFixed(2)} m`;
    const currentTerrain = getTerrainSegmentAt(cameraY);
    terrainDisplay.textContent = `🏞️ Terreno: ${currentTerrain.name.charAt(0).toUpperCase() + currentTerrain.name.slice(1)}`;
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    timeDisplay.textContent = `⏱️ Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    stepsDisplay.textContent = `🚶 Pasos: ${stepsCount}`;


    // 4. Dibujar y actualizar huellas (lógica a futuro)
    footprints.forEach((footprint, index) => {
        footprint.opacity -= 0.01;
        if (footprint.opacity <= 0) {
            footprints.splice(index, 1);
        } else {
            drawFootprint(footprint);
        }
    });

    requestAnimationFrame(gameLoop);
}

function drawFootprint(footprint) {
    ctx.fillStyle = `rgba(0, 0, 0, ${footprint.opacity * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(footprint.x, footprint.y, 10, 20, footprint.rotation, 0, 2 * Math.PI);
    ctx.ellipse(footprint.x + Math.sin(footprint.rotation) * 20, footprint.y - Math.cos(footprint.rotation) * 20, 15, 12, footprint.rotation, 0, 2 * Math.PI);
    ctx.fill();
}

gameLoop();