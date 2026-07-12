// API URL Configuration
// If your backend Worker is deployed on a different domain, replace '/api/clean-pdf' with your Worker's full API URL.
// Example: const API_URL = 'https://pdf-cleaner-api.karankumar.workers.dev/api/clean-pdf';
const API_URL = '/api/clean-pdf';

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadStep = document.getElementById('upload-step');
const processingStep = document.getElementById('processing-step');
const resultStep = document.getElementById('result-step');
const browseLink = document.querySelector('.browse-link');

const resultFilename = document.getElementById('result-filename');
const resultOrigSize = document.getElementById('result-orig-size');
const resultCleanSize = document.getElementById('result-clean-size');
const resultReduction = document.getElementById('result-reduction');
const downloadBtn = document.getElementById('download-btn');
const restartBtn = document.getElementById('restart-btn');

let processedBlob = null;
let processedFilename = '';

// Helper to format byte sizes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Switch between views
function showStep(stepId) {
    [uploadStep, processingStep, resultStep].forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

// Trigger file selection
browseLink.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
});

// Drag and drop event handlers
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
});

// Upload and process PDF
async function uploadFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
    }

    showStep('processing-step');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Failed to process PDF.');
        }

        // Get file data
        processedBlob = await response.blob();
        
        // Extract stats from headers (exposed via CORS Access-Control-Expose-Headers)
        const origSize = parseInt(response.headers.get('X-Original-Size')) || file.size;
        const cleanSize = parseInt(response.headers.get('X-Cleaned-Size')) || processedBlob.size;
        const reductionPercent = response.headers.get('X-Reduction-Percent') || 
            (((origSize - cleanSize) / origSize) * 100).toFixed(1);
        
        // Extract filename from disposition header or default
        const disposition = response.headers.get('Content-Disposition');
        let filename = '';
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        processedFilename = filename || `${file.name.replace(/\.pdf$/i, '')}_cleaned.pdf`;

        // Update results view
        resultFilename.textContent = processedFilename;
        resultOrigSize.textContent = formatBytes(origSize);
        resultCleanSize.textContent = formatBytes(cleanSize);
        resultReduction.textContent = `-${reductionPercent}%`;

        showStep('result-step');
    } catch (error) {
        alert(`Error: ${error.message}`);
        showStep('upload-step');
        fileInput.value = '';
    }
}

// Download action
downloadBtn.addEventListener('click', () => {
    if (!processedBlob) return;
    
    const url = window.URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = processedFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

// Restart action
restartBtn.addEventListener('click', () => {
    processedBlob = null;
    processedFilename = '';
    fileInput.value = '';
    showStep('upload-step');
});
