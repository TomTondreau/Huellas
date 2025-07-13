
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

// --- Objetos de la Escena ---

// Un suelo con una textura procedural simple para simular tierra
const groundGeometry = new THREE.PlaneGeometry(50, 2000); // Hacemos el camino más largo
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x966939, // Un color base de tierra
    roughness: 0.9, // Poco brillo
    metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotamos el plano para que sea el suelo
scene.add(ground);

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
ground.receiveShadow = true;

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
    // Movemos la cámara hacia adelante (en su dirección local)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    camera.position.add(forward.multiplyScalar(moveSpeed));

    // Actualizamos el último dedo que dio un paso
    lastStepFingerId = fingerId;

    // Opcional: vibración para feedback háptico
    if (navigator.vibrate) {
        navigator.vibrate(50); // Vibra por 50ms
    }
}

// --- Bucle de Animación ---

function animate() {
    requestAnimationFrame(animate);

    // Aquí irá la lógica de movimiento

    renderer.render(scene, camera);
}

animate();

// --- Manejo del Redimensionamiento de la Ventana ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
