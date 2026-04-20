// Importamos Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://kbluufxbclywwfxtfdeq.supabase.co';
const supabaseKey = 'sb_publishable_kP3evxfrzBYzv7A_Q-d2uA_hG3O6Vc3';
const supabase = createClient(supabaseUrl, supabaseKey);

// Conectar formulario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');

    if (!uploadForm) {
        console.error("No se encontró el formulario");
        return;
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

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
            // Subir archivo a Supabase Storage (público)
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
                    user_id: null,
                    user_name: "Anónimo"
                }]);
            
            if (error) throw error;

            alert("¡Informe publicado exitosamente!");
            uploadForm.reset();
            submitBtn.textContent = "Subir Informe";
            submitBtn.disabled = false;
            
            // Recargar reportes
            const dynamicContainer = document.getElementById('dynamicReports');
            if (dynamicContainer) renderReports(dynamicContainer);

        } catch (error) {
            console.error("Error:", error);
            alert("Error al subir: " + error.message);
            submitBtn.textContent = "Subir Informe";
            submitBtn.disabled = false;
        }
    });

    // Cargar informes de Supabase
    loadReports();

    // Cargar PDFs de la carpeta pdfs/ vía manifest.json
    loadPdfFolder();
});

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

            article.innerHTML = `
                <span class="date">${fecha}</span>
                <h3 class="paper-title">${report.title}</h3>
                <p class="authors">${report.authors}</p>
                <p class="paper-info">Por: ${report.user_name}</p>
                <div class="paper-actions">
                    <button class="btn-download" onclick="viewPDF('${report.pdf_url}', '${report.file_name}')">Ver PDF</button>
                    <button class="btn-download btn-download-alt" onclick="downloadPDF('${report.pdf_url}', '${report.file_name}')">Descargar</button>
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

// ── PDFs estáticos desde pdfs/manifest.json ──────────────────────────────────

async function loadPdfFolder() {
    const container = document.getElementById('pdfFolderList');
    if (!container) return;

    try {
        const response = await fetch('pdfs/manifest.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const pdfs = await response.json();

        container.innerHTML = '';

        if (!Array.isArray(pdfs) || pdfs.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay PDFs disponibles todavía.</p>';
            return;
        }

        pdfs.forEach((pdf) => {
            const pdfUrl = `pdfs/${pdf.file}`;
            const fecha = pdf.date
                ? new Date(pdf.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
                : '';

            const card = document.createElement('article');
            card.className = 'paper-card';
            card.innerHTML = `
                ${fecha ? `<span class="date">${fecha}</span>` : ''}
                <h3 class="paper-title">${pdf.title}</h3>
                <p class="authors">${pdf.authors}</p>
                <div class="paper-actions">
                    <a class="btn-download" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">👁 Ver</a>
                    <a class="btn-download btn-download-alt" href="${pdfUrl}" download="${pdf.file}">⬇ Descargar</a>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error al cargar manifest.json:', err);
        container.innerHTML = '<p class="empty-msg">No se pudieron cargar los PDFs.</p>';
    }
}

