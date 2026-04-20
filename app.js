// Importamos Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://kbluufxbclywwfxtfdeq.supabase.co';
const supabaseKey = 'sb_publishable_kP3evxfrzBYzv7A_Q-d2uA_hG3O6Vc3';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // Cargar informes de Supabase
    loadReports();

    // Cargar PDFs de la carpeta pdfs/ vía manifest.json
    loadPdfFolder();
});

// Función para cargar y mostrar informes
function loadReports() {
    const dynamicContainer = document.getElementById('dynamicReports');

    if (!dynamicContainer) {
        console.error("No se encontró el contenedor de artículos");
        return;
    }

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
                    <a class="btn-download" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">&#128065; Ver</a>
                    <a class="btn-download btn-download-alt" href="${pdfUrl}" download="${pdf.file}">&#8595; Descargar</a>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error al cargar manifest.json:', err);
        container.innerHTML = '<p class="empty-msg">No se pudieron cargar los PDFs.</p>';
    }
}

