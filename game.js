
// --- Configuración Básica de la Escena ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfab77a); // Color de cielo atardecer
scene.fog = new THREE.Fog(0xfab77a, 10, 50); // Niebla que empieza a 10 unidades y es total a 50
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    antialias: true // Suaviza los bordes
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
console.log("Canvas adjuntado al body:", document.body.contains(renderer.domElement)); // Línea de depuración

// --- Objetos de la Escena ---

// Contenedor para todos los terrenos
const grounds = new THREE.Group();
scene.add(grounds);

// Función para crear un segmento de terreno
function createTerrainSegment(color, length, zPosition) {
    const geometry = new THREE.PlaneGeometry(50, length);
    const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, metalness: 0.1 });
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.x = -Math.PI / 2;
    segment.position.z = zPosition;
    segment.receiveShadow = true;
    grounds.add(segment);
    return segment;
}

// Creación de los segmentos de terreno
const groundLength = 200;
const dirt = createTerrainSegment(0x966939, groundLength, -groundLength * 0.5);
dirt.name = 'tierra';

const mud = createTerrainSegment(0x5C4033, groundLength, -groundLength * 1.5);
mud.name = 'lodo';

const ice = createTerrainSegment(0xFFFFFF, groundLength, -groundLength * 2.5);
ice.name = 'hielo';

const cobblestone = createTerrainSegment(0x505050, groundLength, -groundLength * 3.5);
cobblestone.name = 'adoquin';

// Contenedor para los árboles
const trees = new THREE.Group();
scene.add(trees);

// Array para guardar los árboles activos
const activeTrees = [];
const treePool = []; // Para reutilizar los árboles

// Función para crear un árbol simple (cilindro)
function createTreeMesh() {
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Marrón
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true; // Que proyecte sombras

    const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Verde oscuro
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.castShadow = true;

    const treeGroup = new THREE.Group();
    treeGroup.add(trunk);
    treeGroup.add(leaves);
    leaves.position.y = 3.5; // Posición relativa de las hojas sobre el tronco
    trunk.position.y = 2.5;

    return treeGroup;
}

// Función para colocar un árbol en una posición
function placeTree(x, z) {
    let tree;
    if (treePool.length > 0) {
        tree = treePool.pop(); // Reutilizar de la piscina
    } else {
        tree = createTreeMesh(); // Crear uno nuevo si no hay en la piscina
    }
    tree.position.set(x, 0, z);
    trees.add(tree);
    activeTrees.push(tree);
}

// Array para guardar las rocas activas
const activeRocks = [];
const rockPool = []; // Para reutilizar las rocas

// Función para crear una roca simple (esfera o forma irregular)
function createRockMesh() {
    const geometry = new THREE.DodecahedronGeometry(1 + Math.random() * 1.5, 0); // Forma irregular
    const material = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.8, metalness: 0.1 }); // Gris oscuro
    const rock = new THREE.Mesh(geometry, material);
    rock.castShadow = true;
    return rock;
}

// Función para colocar una roca en una posición
function placeRock(x, z) {
    let rock;
    if (rockPool.length > 0) {
        rock = rockPool.pop();
    } else {
        rock = createRockMesh();
    }
    rock.position.set(x, rock.geometry.parameters.radius, z); // Posición y altura
    scene.add(rock);
    activeRocks.push(rock);
}

// Generar algunas rocas iniciales
for (let i = 0; i < 10; i++) {
    const x = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 10); // Más lejos del camino
    const z = -i * 40 - (Math.random() * 20); // Distancia a lo largo del camino
    placeRock(x, z);
}

// Generar árboles iniciales
for (let i = 0; i < 20; i++) {
    const x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 15); // Lados del camino
    const z = -i * 20 - (Math.random() * 10); // Distancia a lo largo del camino
    placeTree(x, z);
}

// Una luz ambiental cálida
const ambientLight = new THREE.AmbientLight(0xffdcb2, 0.5);
scene.add(ambientLight);

// Una luz direccional (sol) anaranjada para sombras dramáticas
const directionalLight = new THREE.DirectionalLight(0xff9933, 1);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true; // Habilitamos las sombras
scene.add(directionalLight);

// Configuración de sombras
renderer.shadowMap.enabled = true;
// ground.receiveShadow = true; // Ya no es necesario, se asigna en la función

// Posición inicial de la cámara
camera.position.set(0, 2, -5); // Un poco elevada y hacia atrás
camera.lookAt(0, 0, 0); // Mirando al centro de la escena


// --- Lógica de Control ---
const moveSpeed = 0.1; // Velocidad de avance por paso
const stepDistance = 50; // Distancia en píxeles para un paso

let lastStepFingerId = -1;
const touchStartPositions = {};

document.addEventListener('touchstart', (event) => {
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        touchStartPositions[touch.identifier] = touch.clientY;
    }
});

document.addEventListener('touchmove', (event) => {
    // Prevenir el scroll del navegador en móviles
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        // Solo procesamos si el dedo es diferente al último que dio un paso
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
        // Si el dedo que se levanta es el que dio el último paso,
        // permitimos que cualquier otro dedo pueda dar el siguiente.
        if (touch.identifier === lastStepFingerId) {
            lastStepFingerId = -1;
        }
        delete touchStartPositions[touch.identifier];
    }
});

function takeStep(fingerId) {
    let stepSpeed = moveSpeed;
    let vibrationPattern = [50]; // Vibración por defecto

    switch (currentTerrain) {
        case 'lodo':
            stepSpeed *= 0.7; // 30% más lento
            vibrationPattern = [100]; // Vibración más larga
            break;
        case 'hielo':
            stepSpeed *= 1.5; // 50% más rápido
            vibrationPattern = [20]; // Vibración corta
            break;
        case 'adoquin':
            stepSpeed *= 1.0;
            vibrationPattern = [30, 20, 30]; // Doble vibración corta
            break;
        case 'tierra':
        default:
            // Usa los valores por defecto
            break;
    }

    // Movemos la cámara hacia adelante (en su dirección local)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    camera.position.add(forward.multiplyScalar(stepSpeed));

    // Actualizamos el último dedo que dio un paso
    lastStepFingerId = fingerId;

    // Feedback háptico según el terreno
    if (navigator.vibrate) {
        navigator.vibrate(vibrationPattern);
    }
}

// --- Bucle de Animación ---

let currentTerrain = 'tierra';
const raycaster = new THREE.Raycaster();

function animate() {
    requestAnimationFrame(animate);

    // Raycasting para detectar el terreno
    raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(grounds.children);

    if (intersects.length > 0) {
        currentTerrain = intersects[0].object.name;
    }

    // Lógica de generación procedural de árboles
    const cameraZ = camera.position.z;
    const generationDistance = 100; // Distancia a la que generamos nuevos árboles
    const despawnDistance = 50; // Distancia a la que los árboles desaparecen detrás de la cámara

    // Eliminar árboles que están muy atrás y generar nuevos
    for (let i = activeTrees.length - 1; i >= 0; i--) {
        const tree = activeTrees[i];
        if (tree.position.z > cameraZ + despawnDistance) {
            // Si el árbol está muy por delante de la cámara (esto no debería pasar con la lógica actual, pero es una seguridad)
            // o si está muy por detrás y ya no es visible, lo movemos a la piscina
            trees.remove(tree);
            activeTrees.splice(i, 1);
            treePool.push(tree);
        }
    }

    // Generar nuevos árboles si es necesario
    // Buscamos el árbol más lejano (con menor Z) para saber dónde empezar a generar
    let furthestTreeZ = -Infinity;
    if (activeTrees.length > 0) {
        furthestTreeZ = activeTrees.reduce((minZ, tree) => Math.min(minZ, tree.position.z), Infinity);
    }

    // Si el árbol más lejano está demasiado cerca de la cámara, generamos más
    while (furthestTreeZ > cameraZ - generationDistance) {
        const x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 15); // Lados del camino
        const z = furthestTreeZ - (20 + Math.random() * 10); // Generar más lejos
        placeTree(x, z);
        furthestTreeZ = z;
    }

    // Lógica de generación procedural de rocas
    // Eliminar rocas que están muy atrás y generar nuevas
    for (let i = activeRocks.length - 1; i >= 0; i--) {
        const rock = activeRocks[i];
        if (rock.position.z > cameraZ + despawnDistance) {
            scene.remove(rock);
            activeRocks.splice(i, 1);
            rockPool.push(rock);
        }
    }

    // Generar nuevas rocas si es necesario
    let furthestRockZ = -Infinity;
    if (activeRocks.length > 0) {
        furthestRockZ = activeRocks.reduce((minZ, rock) => Math.min(minZ, rock.position.z), Infinity);
    }

    while (furthestRockZ > cameraZ - generationDistance) {
        const x = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 10); // Más lejos del camino
        const z = furthestRockZ - (40 + Math.random() * 20); // Generar más lejos
        placeRock(x, z);
        furthestRockZ = z;
    }

    // Actualizar la posición de las hojas
    const positionsArray = leavesGeometry.attributes.position.array;
    for (let i = 0; i < leafCount; i++) {
        positionsArray[i * 3 + 1] -= 0.1; // Mover hacia abajo (Y)
        positionsArray[i * 3 + 0] += (Math.random() - 0.5) * 0.05; // Pequeño movimiento lateral (X)
        positionsArray[i * 3 + 2] += (Math.random() - 0.5) * 0.05; // Pequeño movimiento en Z

        // Si la hoja cae por debajo del suelo o se va muy atrás, la reseteamos arriba
        if (positionsArray[i * 3 + 1] < -5 || positionsArray[i * 3 + 2] > cameraZ + 10) {
            positionsArray[i * 3 + 1] = 50; // Reiniciar en la parte superior
            positionsArray[i * 3 + 0] = (Math.random() - 0.5) * 100; // Nueva posición X aleatoria
            positionsArray[i * 3 + 2] = cameraZ - (Math.random() * 200); // Nueva posición Z aleatoria delante de la cámara
        }
    }
    leavesGeometry.attributes.position.needsUpdate = true; // Indicar a Three.js que actualice la geometría

    renderer.render(scene, camera);
}

animate();

// --- Manejo del Redimensionamiento de la Ventana ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
