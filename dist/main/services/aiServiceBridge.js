"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAiServerSafely = callAiServerSafely;
async function callAiServerSafely(endpoint, payload, token) {
    try {
        const response = await fetch('http://localhost:8787' + endpoint, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const responseBody = await response.json().catch(() => null);
        if (!response.ok) {
            console.error('[AI Service Error] Status:', response.status, responseBody);
            return { success: false, error: responseBody?.error || `AI server responded with status ${response.status}` };
        }
        return { success: true, data: responseBody };
    }
    catch (error) {
        if (error.response) {
            console.error('[AI Service Error] Status: ' + error.response.status, error.response.data);
            return { success: false, error: error.response.data.error || 'AI server rejected the request' };
        }
        else if (error.request) {
            console.error('[AI Service Error] No response received from AI daemon/server.');
            return { success: false, error: 'AI server is unreachable. Please check if the daemon is running.' };
        }
        else {
            console.error('[AI Service Error]', error.message);
            return { success: false, error: error.message };
        }
    }
}
