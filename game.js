// --- Configuración Básica de la Escena ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
console.log("Canvas adjuntado al body:", document.body.contains(renderer.domElement)); // Línea de depuración

// Establecer un color de fondo para el renderizador
renderer.setClearColor(0x0000ff); // Azul brillante

// Posición inicial de la cámara
camera.position.set(0, 0, 5); // Un poco hacia atrás para ver el origen
camera.lookAt(0, 0, 0); // Mirando al centro de la escena

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// --- Manejo del Redimensionamiento de la Ventana ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});