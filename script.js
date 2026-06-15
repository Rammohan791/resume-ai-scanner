// script.js - Core Scan Logic with Direct Frontend Gemini API Call
let originalPdfBase64 = null;
let layoutMapping = [];
let fullResumeText = "";

// ⚠️ IMPORTANT: Apni Real Gemini API Key yahan dalein
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

// PDF.js engine to extract raw text and exact word coordinates
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
            fullResumeText += item.str + " ";
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

    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || GEMINI_API_KEY === "") {
        alert("Bhai, script.js ki line 7 me apni real Gemini API Key daalo!");
        resetButton();
        return;
    }

    // High level strict prompt for exact error identification
    const promptText = `
    You are an advanced ATS Resume Analyzer. Analyze the provided resume text and coordinate map data.
    Your job is to identify REAL grammatical errors, typos, spelling mistakes, or severe alignment/indentation anomalies.
    
    CRITICAL: Do NOT flag standard section headings like "Profile Summary", "Skills", "Technical Skills", or "Experience" as errors unless they have a blatant typo.
    
    [Resume Text]: ${fullResumeText}
    [Coordinate Mapping Data]: ${JSON.stringify(layoutMapping.slice(0, 350))}
    
    Respond strictly in a valid JSON format. Do not write any markdown code blocks or prose. Match the exact JSON keys below:
    {
      "atsScore": 78,
      "errors": [
        { "text": "exact_wrong_word_from_text", "type": "GRAMMAR", "suggestion": "CorrectWord", "reason": "Spelling mistake or grammar issue" }
      ]
    }`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        const data = await response.json();
        const rawAiText = data.candidates[0].content.parts[0].text;
        const aiResult = JSON.parse(rawAiText);
        
        // Save to local storage for result.html dashboard
        localStorage.setItem('user_pdf', originalPdfBase64);
        localStorage.setItem('ai_analysis_report', JSON.stringify(aiResult));
        localStorage.setItem('layout_mapping', JSON.stringify(layoutMapping));
        localStorage.setItem('user_score', aiResult.atsScore + "%");

        // Transition layout view
        document.getElementById('upload-box').style.display = "none";
        document.getElementById('result-box').style.display = "block";
        document.getElementById('dynamicScore').innerText = aiResult.atsScore + "%";
        
        const msg = document.getElementById('statusMsg');
        if (aiResult.atsScore >= 85) {
            msg.innerText = "✅ Excellent Structure! minor improvements available.";
            msg.style.color = "#00ff96";
        } else {
            msg.innerText = "⚠️ Issues Detected! Optimization Required.";
            msg.style.color = "#ff4d4d";
        }

    } catch (error) {
        console.error(error);
        alert("Scanning complete hone me dikkat aayi. Check your API Key or Network connection!");
        resetButton();
    }
}

function goToDashboard(type) {
    if (!originalPdfBase64) return alert("Data missing!");
    window.location.href = "./result.html";
}

function resetButton() {
    document.getElementById('btnText').innerText = "ANALYZE RESUME";
    document.getElementById('mainBtn').disabled = false;
}
