let originalPdfBase64 = null;
let calculatedScore = 0;
let isScanning = false;

document.getElementById('resumeInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            originalPdfBase64 = btoa(String.fromCharCode.apply(null, typedarray));
            await startAIScan(typedarray);
        };
        reader.readAsArrayBuffer(file);
    }
});

async function startAIScan(data) {
    isScanning = true;
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument({data: data}).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(" ").toLowerCase();
    }

    // --- SMART LOGIC ---
    let score = 30;
    // Check if it's already optimized by us
    if (text.includes("rammohan_ai_verified") || text.includes("senior full-stack engineer")) {
        score = 97;
    } else {
        const keywords = ["java", "python", "skills", "projects", "education", "experience", "api", "react", "sql"];
        keywords.forEach(w => { if(text.includes(w)) score += 7; });
        if(text.length > 600) score += 10;
    }

    calculatedScore = Math.min(score, 98);
    isScanning = false;
}

function analyzeResume() {
    document.getElementById('upload-box').style.display = "none";
    document.getElementById('result-box').style.display = "block";
    document.getElementById('dynamicScore').innerText = calculatedScore + "%";
    
    const msg = document.getElementById('statusMsg');
    msg.innerText = calculatedScore > 80 ? "✅ Excellent Resume!" : "⚠️ Critical Fixes Required!";
    msg.style.color = calculatedScore > 80 ? "#00ff96" : "#ff4d4d";
    
    localStorage.setItem('user_score', calculatedScore + "%");
}

function payNow(amt, type) {
    const options = {
        "key": "rzp_test_STC8d1Ju9UhctD",
        "amount": amt * 100,
        "name": "Ram Mohan AI",
        "handler": function () {
            localStorage.setItem('user_pdf', originalPdfBase64);
            localStorage.setItem('pay_type', type);
            window.location.href = "result.html";
        }
    };
    new Razorpay(options).open();
}