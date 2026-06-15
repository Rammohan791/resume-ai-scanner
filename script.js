// script.js - Core Scan Logic with Direct Frontend Gemini API Call
let originalPdfBase64 = null;
let layoutMapping = [];
let fullResumeText = "";

// ⚠️ IMPORTANT: Apni Gemini API Key yahan dalein
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 

// File selection handler
document.getElementById('resumeInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            originalPdfBase64 = btoa(String.fromCharCode.apply(null, typedarray));
            await extractPdfTextAndCoordinates(typedarray);
        };
        reader.readAsArrayBuffer(file);
    }
});

// PDF.js engine to extract raw text and exact word bounding boxes/coordinates
async function extractPdfTextAndCoordinates(data) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument({data: data}).promise;
    layoutMapping = [];
    fullResumeText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        content.items.forEach(item => {
            // Full text build up for AI contextual scanning
            fullResumeText += item.str + " ";
            // Exact layout map extraction for highlighting coordinates on canvas
            layoutMapping.push({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height
            });
        });
    }
}

// Triggers when user clicks 'ANALYZE RESUME'
async function analyzeResume() {
    if (!originalPdfBase64 || fullResumeText.trim() === "") {
        alert("Bhai, pehle file to select aur load hone do!");
        resetButton();
        return;
    }

    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        alert("Bhai, script.js ki line 6 me apni real Gemini API Key to daalo!");
        resetButton();
        return;
    }

    // Dynamic AI prompt instructing structural and grammatical tracking via coordinates
    const promptText = `
    You are an expert ATS System and Grammar Checker. Analyze this resume text and layout data.
    Identify grammatical mistakes, typos, and alignment anomalies based on text coordinates.

    [Resume Content]: ${fullResumeText}
    [Layout/Coordinates Data]: ${JSON.stringify(layoutMapping.slice(0, 400))} 

    Respond strictly in JSON format with this structure:
    {
      "atsScore": 85,
      "errors": [
        { "text": "wrong_word", "type": "GRAMMAR", "suggestion": "correct_word", "reason": "Subject-verb agreement issue" },
        { "text": "Profile Summary", "type": "ALIGNMENT", "suggestion": "Profile Summary", "reason": "Indentation is breaking ATS rule" }
      ]
    }`;

    // Direct Integration with Gemini API REST Endpoint from Frontend
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API Response Error: ${response.statusText}`);
        }

        const data = await response.json();
        const rawAiText = data.candidates[0].content.parts[0].text;
        const aiResult = JSON.parse(rawAiText);
        
        // Storing data to localStorage for result.html dashboard render pipeline
        localStorage.setItem('user_pdf', originalPdfBase64);
        localStorage.setItem('ai_analysis_report', JSON.stringify(aiResult));
        localStorage.setItem('layout_mapping', JSON.stringify(layoutMapping));
        localStorage.setItem('user_score', aiResult.atsScore + "%");

        // Dynamic transition to display state
        document.getElementById('upload-box').style.display = "none";
        document.getElementById('result-box').style.display = "block";
        document.getElementById('dynamicScore').innerText = aiResult.atsScore + "%";
        
        const msg = document.getElementById('statusMsg');
        msg.innerText = aiResult.atsScore > 80 ? "✅ Structure Passed! Optimization Ready." : "⚠️ Grammar/Alignment Fixes Required!";
        msg.style.color = aiResult.atsScore > 80 ? "#00ff96" : "#ff4d4d";

    } catch (error) {
        console.error("AI Scanning Process Broken: ", error);
        alert("Gemini AI Engine se connect nahi ho paye. Apni API key re-check karein!");
        resetButton();
    }
}

// Router to pass workflow into dynamic result dashboard
function goToDashboard(type) {
    if (!originalPdfBase64) {
        return alert("Bhai, data missing hai!");
    }
    window.location.href = "./result.html";
}

// Reset UI state if operation drops
function resetButton() {
    document.getElementById('btnText').innerText = "ANALYZE RESUME";
    document.getElementById('mainBtn').disabled = false;
}
