// Importamos Firebase desde el CDN para usarlo directo en HTML
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiJYM5_41Qa3wdalj-0vVU37oLMqnW1tw",
  authDomain: "informes-3ddf2.firebaseapp.com",
  projectId: "informes-3ddf2",
  storageBucket: "informes-3ddf2.firebasestorage.app",
  messagingSenderId: "459068833148",
  appId: "1:459068833148:web:ba647fa31fa4c357b278f9",
  measurementId: "G-FL1BFGHCRT"
};

// Inicializar Firebase, Storage y Firestore
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

// Monitorear estado de autenticación
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI();
});

// Actualizar interfaz según autenticación
function updateAuthUI() {
    const uploadSection = document.querySelector('.upload-section');
    const userNameSpan = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (currentUser) {
        // Usuario autenticado
        if (userNameSpan) userNameSpan.textContent = currentUser.displayName || currentUser.email;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (uploadSection) uploadSection.style.display = 'block';
    } else {
        // Usuario no autenticado
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
    }
}

// Login con Google
window.loginWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Sesión iniciada:', result.user.displayName);
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión');
    }
}

// Logout
window.logout = async function() {
    try {
        await signOut(auth);
        console.log('Sesión cerrada');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Conectar con el formulario de tu HTML cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');

    if (!uploadForm) {
        console.error("No se encontró el formulario");
        return;
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Debes iniciar sesión para subir archivos");
            return;
        }

        const title = document.getElementById('title').value;
        const authors = document.getElementById('authors').value;
        const file = document.getElementById('pdfFile').files[0];

        if (!file) {
            alert("Por favor selecciona un archivo PDF");
            return;
        }

        const submitBtn = uploadForm.querySelector('.btn-submit');
        submitBtn.textContent = "Subiendo...";
        submitBtn.disabled = true;

        try {
            // Subir archivo a Firebase Storage
            const fileRef = ref(storage, `informes/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const pdfUrl = await getDownloadURL(fileRef);

            // Guardar referencia en Firestore con URL de Firebase
            await addDoc(collection(db, "reports"), {
                title: title,
                authors: authors,
                pdfUrl: pdfUrl,
                fileName: file.name,
                createdAt: serverTimestamp(),
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email
            });

            alert("¡Informe publicado exitosamente!");
            uploadForm.reset();
            submitBtn.textContent = "🚀 Subir Informe";
            submitBtn.disabled = false;

        } catch (error) {
            console.error("Error:", error);
            alert("Error al subir: " + error.message);
            submitBtn.textContent = "🚀 Subir Informe";
            submitBtn.disabled = false;
        }
    });

    // Cargar informes desde Firestore
    loadReports();
});

// Función para eliminar informe
window.deleteReport = async function(reportId) {
    if (!currentUser) {
        alert("Debes iniciar sesión");
        return;
    }

    if (confirm("¿Estás seguro de que deseas eliminar este informe?")) {
        try {
            const reportRef = doc(db, "reports", reportId);
            await deleteDoc(reportRef);
            alert("Informe eliminado correctamente");
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar el informe");
        }
    }
}

// Función para cargar y mostrar informes
function loadReports() {
    const articlesSection = document.querySelector('.articles-section');
    const papersContainer = articlesSection.querySelector('article') ? articlesSection : null;

    if (!papersContainer) {
        console.error("No se encontró el contenedor de artículos");
        return;
    }

    // Crear contenedor para artículos dinámicos
    let dynamicContainer = document.getElementById('dynamicReports');
    if (!dynamicContainer) {
        dynamicContainer = document.createElement('div');
        dynamicContainer.id = 'dynamicReports';
        articlesSection.appendChild(dynamicContainer);
    }

    // Escuchar cambios en Firestore en tiempo real
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        dynamicContainer.innerHTML = '';
        
        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const article = document.createElement('article');
            article.className = 'paper-card';

            const fecha = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long'
            }) : 'Reciente';

            // Botón eliminar solo si es el propietario
            const isOwner = currentUser && currentUser.uid === data.userId;
            const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteReport('${docSnapshot.id}')">🗑️ Eliminar</button>` : '';

            article.innerHTML = `
                <span class="date">${fecha}</span>
                <h3 class="paper-title">${data.title}</h3>
                <p class="authors">${data.authors}</p>
                <p class="paper-info">Por: ${data.userName}</p>
                <div class="paper-actions">
                    <button class="btn-download" onclick="viewPDF('${data.pdfUrl}', '${data.fileName}')">👁️ Ver PDF</button>
                    <button class="btn-download btn-download-alt" onclick="downloadPDF('${data.pdfUrl}', '${data.fileName}')">📥 Descargar</button>
                    ${deleteBtn}
                </div>
            `;
            
            dynamicContainer.appendChild(article);
        });
    });
}

// Función para descargar PDF desde URL
window.downloadPDF = function(pdfUrl, fileName) {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'documento.pdf';
    link.click();
}

// Función para ver PDF en una nueva ventana
window.viewPDF = function(pdfUrl, fileName) {
    const newWindow = window.open();
    newWindow.document.write(`
        <html>
        <head>
            <title>${fileName}</title>
            <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100vw; height: 100vh; border: none; }
            </style>
        </head>
        <body>
            <iframe src="${pdfUrl}"></iframe>
        </body>
        </html>
    `);
}