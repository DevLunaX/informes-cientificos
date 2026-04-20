# 📚 Journal of University Reports

Repositorio oficial de investigaciones y prácticas universitarias.

## 🌐 Sitio en vivo

El sitio se publica automáticamente en **GitHub Pages** desde la rama principal.

---

## 📂 Cómo subir PDFs de compañeros

El repositorio incluye la carpeta `pdfs/` para almacenar informes en formato PDF que se mostrarán automáticamente en el sitio.

### Paso 1 – Agrega el archivo PDF

Coloca el archivo PDF dentro de la carpeta `pdfs/`:

```
pdfs/
├── manifest.json          ← lista de PDFs registrados
├── informe-luna.pdf
├── informe-moctezuma.pdf
└── ...
```

### Paso 2 – Actualiza `pdfs/manifest.json`

Abre el archivo `pdfs/manifest.json` y añade una entrada por cada PDF nuevo:

```json
[
  {
    "file": "informe-luna.pdf",
    "title": "Análisis de Algoritmos de Ordenamiento en Sistemas Distribuidos",
    "authors": "Luna García, Moctezuma López",
    "date": "2025-06-01"
  },
  {
    "file": "informe-gonzalez.pdf",
    "title": "Redes Neuronales Aplicadas a la Detección de Anomalías",
    "authors": "González Rodríguez",
    "date": "2025-06-15"
  }
]
```

| Campo | Descripción | Requerido |
|-------|-------------|-----------|
| `file` | Nombre exacto del archivo dentro de `pdfs/` | ✅ |
| `title` | Título del informe que aparecerá en el sitio | ✅ |
| `authors` | Nombre(s) del/los autor(es) | ✅ |
| `date` | Fecha en formato `YYYY-MM-DD` | opcional |

### Paso 3 – Sube los cambios

```bash
git add pdfs/tu-informe.pdf pdfs/manifest.json
git commit -m "feat: agregar informe de <nombre>"
git push
```

En pocos minutos GitHub Pages actualizará el sitio y el nuevo PDF aparecerá en la sección **📂 PDFs de Compañeros** con botones de **Ver** y **Descargar**.

---

## 🔍 Cómo se refleja en el index

El archivo `app.js` hace un `fetch('pdfs/manifest.json')` al cargar la página.
Por cada entrada del manifest genera una tarjeta con:

- **👁 Ver** → abre el PDF en una nueva pestaña del navegador.
- **⬇ Descargar** → descarga el archivo directamente usando el atributo `download`.

Si el manifest no existe o está vacío, el sitio muestra un mensaje informativo.

---

## 📤 Publicar informe vía formulario

La sección superior **"📤 Publicar nuevo informe"** usa Supabase Storage para subir PDFs sin necesidad de tocar el repositorio. Es ideal para subidas rápidas desde el navegador.

---

## 🛠 Estructura del proyecto

```
informes-cientificos/
├── index.html       ← página principal
├── app.js           ← lógica: Supabase + manifest.json
├── styles.css       ← estilos
├── pdfs/
│   ├── .gitkeep     ← mantiene la carpeta en Git
│   ├── manifest.json← lista de PDFs estáticos
│   └── *.pdf        ← archivos PDF de compañeros
└── README.md
```
