// API Base URL
const API_BASE = window.location.origin + '/api';

// DOM Elements
const tabs = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const documentForm = document.getElementById('document-upload-form');
const textForm = document.getElementById('text-upload-form');
const chatForm = document.getElementById('chat-form');
const uploadStatus = document.getElementById('upload-status');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const userId = document.getElementById('user-id');
const viewHistoryBtn = document.getElementById('view-history-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyModal = document.getElementById('history-modal');
const refreshStatsBtn = document.getElementById('refresh-stats-btn');
const statsDisplay = document.getElementById('stats-display');

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        if (tabName === 'stats') {
            loadStats();
        }
    });
});

// Document Upload
documentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const password = document.getElementById('password-doc').value;
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('upload-progress-text');

    if (!file) {
        showStatus('Please select a file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('password', password);
    formData.append('file', file);

    const btn = documentForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    // Show progress UI
    progressBar.style.display = 'block';
    progressBar.value = 0;
    progressText.style.display = 'block';
    progressText.textContent = 'Uploading...';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload/document`);

    xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.value = percent;
            progressText.textContent = `Upload: ${percent}%`;
        }
    };

    xhr.onload = function () {
        try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 202 && data.success && data.jobId) {
                progressBar.value = 100;
                progressText.textContent = 'Upload complete. Processing...';
                // Poll job status
                pollJobStatus(data.jobId, (job) => {
                    // update progress bar with job.progress
                    if (typeof job.progress === 'number') progressBar.value = job.progress;
                    if (job.message) progressText.textContent = `${job.message} (${job.progress || 0}%)`;
                }, (finalJob) => {
                    if (finalJob.status === 'completed') {
                        showStatus(`✅ ${finalJob.message || 'Processing completed'}`, 'success');
                    } else {
                        showStatus(`❌ ${finalJob.message || 'Processing failed'}`, 'error');
                    }
                    // Reset UI
                    setButtonLoading(btn, false);
                    setTimeout(() => {
                        progressBar.style.display = 'none';
                        progressText.style.display = 'none';
                        progressBar.value = 0;
                    }, 2000);
                });
            } else {
                showStatus(`❌ ${data.error || 'Upload failed'}`, 'error');
                setButtonLoading(btn, false);
                progressBar.style.display = 'none';
                progressText.style.display = 'none';
            }
        } catch (err) {
            showStatus(`❌ Upload failed: ${err.message}`, 'error');
            setButtonLoading(btn, false);
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
        }
    };

    xhr.onerror = function () {
        showStatus('❌ Upload error (network)', 'error');
        setButtonLoading(btn, false);
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
    };

    xhr.send(formData);
});

/**
 * Poll job status endpoint until completion or failure.
 * progressCb(job) called on each poll; finalCb(job) on completion.
 */
function pollJobStatus(jobId, progressCb, finalCb) {
    const interval = 2000; // 2s
    let elapsed = 0;
    const maxWait = 10 * 60 * 1000; // 10 minutes

    async function check() {
        try {
            const resp = await fetch(`${API_BASE}/upload/status/${jobId}`);
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Unknown');
            const job = data.data;
            progressCb && progressCb(job);

            if (job.status === 'completed' || job.status === 'failed') {
                finalCb && finalCb(job);
                return;
            }

            elapsed += interval;
            if (elapsed >= maxWait) {
                finalCb && finalCb({ status: 'failed', message: 'Processing timed out' });
                return;
            }

            setTimeout(check, interval);
        } catch (err) {
            // If polling fails, retry a few times then give up
            elapsed += interval;
            if (elapsed >= maxWait) {
                finalCb && finalCb({ status: 'failed', message: 'Processing error: ' + (err.message || err) });
                return;
            }
            setTimeout(check, interval);
        }
    }

    check();
}

// Text Upload
textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password-text').value;
    const source = document.getElementById('text-source').value;
    const text = document.getElementById('text-content').value;
    
    const btn = textForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    
    try {
        const response = await fetch(`${API_BASE}/upload/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password, source, text })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(`✅ ${data.data.message}`, 'success');
            textForm.reset();
            document.getElementById('text-source').value = 'manual-input';
        } else {
            showStatus(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
});

// Chat
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = chatInput.value.trim();
    const userIdValue = userId.value.trim();
    
    if (!query || !userIdValue) return;
    
    // Add user message
    addMessage(query, 'user');
    chatInput.value = '';
    
    // Add bot placeholder
    const botMessageDiv = addMessage('', 'bot');
    const messageContent = botMessageDiv.querySelector('.message-content');
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userIdValue,
                query
            })
        });
        
        if (!response.ok) {
            throw new Error('Chat request failed');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let fullResponse = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            messageContent.textContent = `❌ Error: ${data.error}`;
                            break;
                        }
                        
                        if (data.chunk) {
                            fullResponse += data.chunk;
                            messageContent.textContent = fullResponse;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                        
                        if (data.done) {
                            console.log('Response completed');
                        }
                    } catch (e) {
                        // Ignore JSON parse errors for incomplete chunks
                    }
                }
            }
        }
        
    } catch (error) {
        messageContent.textContent = `❌ Error: ${error.message}`;
    }
});

// View History
viewHistoryBtn.addEventListener('click', async () => {
    const userIdValue = userId.value.trim();
    
    if (!userIdValue) {
        alert('Please enter a user ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/chat/history/${userIdValue}?page=1&pageSize=20`);
        const data = await response.json();
        
        if (data.success) {
            displayHistory(data.data);
            historyModal.style.display = 'block';
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        alert(`Error loading history: ${error.message}`);
    }
});

// Clear History
clearHistoryBtn.addEventListener('click', async () => {
    const userIdValue = userId.value.trim();
    
    if (!userIdValue) {
        alert('Please enter a user ID');
        return;
    }
    
    if (!confirm('Are you sure you want to clear chat history?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/chat/history/${userIdValue}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Chat history cleared');
            chatMessages.innerHTML = `
                <div class="chat-message bot">
                    <div class="message-content">
                        👋 Hello! I'm your RAG assistant. Ask me anything about the uploaded documents!
                    </div>
                </div>
            `;
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        alert(`Error clearing history: ${error.message}`);
    }
});

// Close Modal
historyModal.querySelector('.close').addEventListener('click', () => {
    historyModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.style.display = 'none';
    }
});

// Load Stats
refreshStatsBtn.addEventListener('click', loadStats);

async function loadStats() {
    try {
        const [healthResponse, uploadStatsResponse] = await Promise.all([
            fetch(`${API_BASE}/health`),
            fetch(`${API_BASE}/upload/stats`)
        ]);
        
        const health = await healthResponse.json();
        const uploadStats = await uploadStatsResponse.json();
        
        displayStats({ health, uploadStats });
    } catch (error) {
        statsDisplay.innerHTML = `<p class="error">❌ Error loading stats: ${error.message}</p>`;
    }
}

// Helper Functions
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status-message ${type}`;
    uploadStatus.style.display = 'block';
    
    setTimeout(() => {
        uploadStatus.style.display = 'none';
    }, 5000);
}

function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

function displayHistory(historyData) {
    const content = document.getElementById('history-content');
    
    if (historyData.messages.length === 0) {
        content.innerHTML = '<p>No chat history found.</p>';
        return;
    }
    
    let html = `
        <div class="history-info">
            <p>User: <strong>${historyData.userId}</strong></p>
            <p>Total Messages: <strong>${historyData.total}</strong></p>
            <p>Page: <strong>${historyData.page} / ${historyData.totalPages}</strong></p>
        </div>
        <div class="history-messages">
    `;
    
    historyData.messages.forEach(msg => {
        html += `
            <div class="history-item">
                <div class="history-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
                <div class="history-query"><strong>Q:</strong> ${msg.query}</div>
                <div class="history-response"><strong>A:</strong> ${msg.response}</div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

function displayStats(data) {
    const { health, uploadStats } = data;
    
    let html = '';
    
    if (health.success) {
        html += `
            <div class="stat-item">
                <h3>🏥 System Health</h3>
                <pre>${JSON.stringify(health.services, null, 2)}</pre>
            </div>
        `;
    }
    
    if (uploadStats.success) {
        html += `
            <div class="stat-item">
                <h3>📊 Upload Statistics</h3>
                <p>Total Chunks: <strong>${uploadStats.data.totalChunks}</strong></p>
                ${uploadStats.data.collectionInfo ? `
                    <p>Vector Size: <strong>${uploadStats.data.collectionInfo.vectorSize}</strong></p>
                    <p>Distance Metric: <strong>${uploadStats.data.collectionInfo.distance}</strong></p>
                ` : ''}
            </div>
        `;
    }
    
    statsDisplay.innerHTML = html;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('RAG Chatbot UI initialized');
});
