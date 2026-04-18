// Importamos Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://kbluufxbclywwfxtfdeq.supabase.co';
const supabaseKey = 'sb_publishable_kP3evxfrzBYzv7A_Q-d2uA_hG3O6Vc3';
const supabase = createClient(supabaseUrl, supabaseKey);

let currentUser = null;

// Monitorear estado de autenticación
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
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

// Login con email/contraseña (simplificado)
window.loginWithGoogle = async function() {
    try {
        const email = prompt("Ingresa tu email:");
        if (!email) return;
        
        const { data, error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        
        const otp = prompt("Revisa tu email y pega el código OTP:");
        if (!otp) return;
        
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
        });
        if (sessionError) throw sessionError;
        
        console.log('Sesión iniciada');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error: ' + error.message);
    }
}

// Logout
window.logout = async function() {
    try {
        await supabase.auth.signOut();
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
            // Subir archivo a Supabase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('informes')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;

            // Obtener URL pública del archivo
            const { data: publicData } = supabase.storage
                .from('informes')
                .getPublicUrl(fileName);
            
            const pdfUrl = publicData.publicUrl;

            // Guardar referencia en Supabase Database
            const { data, error } = await supabase
                .from('reports')
                .insert([{
                    title: title,
                    authors: authors,
                    pdf_url: pdfUrl,
                    file_name: file.name,
                    user_id: currentUser.id,
                    user_name: currentUser.email
                }]);
            
            if (error) throw error;

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
            const { error } = await supabase
                .from('reports')
                .delete()
                .eq('id', reportId);
            
            if (error) throw error;
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
    
    if (!articlesSection) {
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

    // Escuchar cambios en Supabase en tiempo real
    const subscription = supabase
        .from('reports')
        .on('*', payload => {
            renderReports(dynamicContainer);
        })
        .subscribe();

    // Cargar reportes iniciales
    renderReports(dynamicContainer);
}

async function renderReports(container) {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        container.innerHTML = '';
        
        data.forEach((report) => {
            const article = document.createElement('article');
            article.className = 'paper-card';

            const fecha = report.created_at ? new Date(report.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long'
            }) : 'Reciente';

            // Botón eliminar solo si es el propietario
            const isOwner = currentUser && currentUser.id === report.user_id;
            const deleteBtn = isOwner ? `<button class="btn-delete" onclick="deleteReport('${report.id}')">🗑️ Eliminar</button>` : '';

            article.innerHTML = `
                <span class="date">${fecha}</span>
                <h3 class="paper-title">${report.title}</h3>
                <p class="authors">${report.authors}</p>
                <p class="paper-info">Por: ${report.user_name}</p>
                <div class="paper-actions">
                    <button class="btn-download" onclick="viewPDF('${report.pdf_url}', '${report.file_name}')">👁️ Ver PDF</button>
                    <button class="btn-download btn-download-alt" onclick="downloadPDF('${report.pdf_url}', '${report.file_name}')">📥 Descargar</button>
                    ${deleteBtn}
                </div>
            `;
            
            container.appendChild(article);
        });
    } catch (error) {
        console.error("Error al cargar reportes:", error);
    }
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