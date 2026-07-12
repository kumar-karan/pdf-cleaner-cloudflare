const API_URL = 'https://pdf-cleaner-api.campacola45.workers.dev';

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
    
    const statusDesc = document.getElementById('status-desc');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    
    // Reset state elements
    progressBarFill.style.width = '0%';
    progressBarFill.classList.remove('processing');
    statusDesc.textContent = 'Uploading PDF... 0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL);
    xhr.responseType = 'blob'; // Receive response as a binary blob
    
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('X-File-Name', file.name);

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            statusDesc.textContent = `Uploading PDF... ${percent}%`;
            progressBarFill.style.width = `${percent}%`;
            
            if (percent === 100) {
                statusDesc.textContent = 'Processing PDF... Analyzing pages and removing annotations';
                progressBarFill.classList.add('processing');
            }
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            processedBlob = xhr.response;
            
            // Extract stats from headers (exposed via CORS Access-Control-Expose-Headers)
            const origSize = parseInt(xhr.getResponseHeader('X-Original-Size')) || file.size;
            const cleanSize = parseInt(xhr.getResponseHeader('X-Cleaned-Size')) || processedBlob.size;
            const reductionPercent = xhr.getResponseHeader('X-Reduction-Percent') || 
                (((origSize - cleanSize) / origSize) * 100).toFixed(1);
            
            // Extract filename from disposition header or default
            const disposition = xhr.getResponseHeader('Content-Disposition');
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
        } else {
            // Read error text from blob
            const reader = new FileReader();
            reader.onload = () => {
                alert(`Error: ${reader.result || 'Failed to process PDF.'}`);
                showStep('upload-step');
            };
            reader.readAsText(xhr.response);
        }
    });

    xhr.addEventListener('error', () => {
        alert('Network error occurred during upload.');
        showStep('upload-step');
    });

    xhr.send(file);
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
