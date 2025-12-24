// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDwGzTPmFg-gjoYtNWNJM47p22NfBugYFA",
    authDomain: "mock-test-1eea6.firebaseapp.com",
    databaseURL: "https://mock-test-1eea6-default-rtdb.firebaseio.com",
    projectId: "mock-test-1eea6",
    storageBucket: "mock-test-1eea6.firebaseapp.com",
    messagingSenderId: "111849173136",
    appId: "1:111849173136:web:8b211f58d854119e88a815",
    measurementId: "G-5RLWPTP8YD"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// 2. DOM ELEMENTS & VARIABLES
// ==========================================
const inputs = {
    id: document.getElementById('quiz-id-input'),
    title: document.getElementById('quiz-title-input'),
    time: document.getElementById('time-input'),
    marks: document.getElementById('marks-input'),
    neg: document.getElementById('negative-input'),
    pass: document.getElementById('pass-mark-input'),
    
    // Single Question Form
    qText: document.getElementById('question-text-input'),
    ops: [
        document.getElementById('option1-input'),
        document.getElementById('option2-input'),
        document.getElementById('option3-input'),
        document.getElementById('option4-input')
    ],
    correct: document.getElementById('correct-option-select'),
    expl: document.getElementById('explanation-input'),

    // Bulk Form
    bulkText: document.getElementById('bulk-input-textarea') 
};

let questions = [];
let editIdx = -1;
const statusMsg = document.getElementById('status-message');

// ==========================================
// 3. EVENT LISTENERS
// ==========================================
document.getElementById('add-question-btn').addEventListener('click', addQ);
document.getElementById('update-question-btn').addEventListener('click', updQ);
document.getElementById('save-quiz-btn').addEventListener('click', saveFirebase);
document.getElementById('load-quiz-btn').addEventListener('click', loadFirebase);

// বাল্ক বাটন (যদি HTML-এ থাকে তবেই কাজ করবে)
const bulkBtn = document.getElementById('process-bulk-btn');
if(bulkBtn) bulkBtn.addEventListener('click', procBulk);


// ==========================================
// 4. CORE FUNCTIONS (SINGLE QUESTION)
// ==========================================

// প্রশ্ন ফর্ম থেকে ডাটা নেওয়া
function getFormData() {
    const q = inputs.qText.value.trim();
    const ops = inputs.ops.map(i => i.value.trim());
    const c = inputs.correct.value;
    const ex = inputs.expl.value.trim();

    if(!q || ops.some(o=>!o) || !c) {
        show("সব তথ্য দিন (প্রশ্ন, অপশন এবং সঠিক উত্তর)!", "error");
        return null;
    }
    
    return { 
        question: q, 
        options: ops, 
        answer: ops[parseInt(c)], 
        explanation: ex 
    };
}

// প্রশ্ন যোগ করা
function addQ() {
    const data = getFormData();
    if(data) {
        questions.push(data);
        render();
        clearForm();
        show("প্রশ্ন যোগ হয়েছে", "success");
    }
}

// প্রশ্ন এডিট মোডে লোড করা
function editQ(i) {
    const q = questions[i];
    inputs.qText.value = q.question;
    inputs.ops.forEach((inp, idx) => inp.value = q.options[idx]);
    inputs.correct.value = q.options.indexOf(q.answer);
    inputs.expl.value = q.explanation || "";
    
    editIdx = i;
    document.getElementById('add-question-btn').style.display = 'none';
    document.getElementById('update-question-btn').style.display = 'inline-block';
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({behavior: 'smooth'});
}

// আপডেট করা
function updQ() {
    const data = getFormData();
    if(data) {
        questions[editIdx] = data;
        editIdx = -1;
        document.getElementById('add-question-btn').style.display = 'inline-block';
        document.getElementById('update-question-btn').style.display = 'none';
        render();
        clearForm();
        show("আপডেট হয়েছে", "success");
    }
}

// ডিলিট করা
function delQ(i) {
    if(confirm("এই প্রশ্নটি মুছে ফেলতে চান?")) {
        questions.splice(i, 1);
        render();
    }
}

// ফর্ম পরিষ্কার করা
function clearForm() {
    inputs.qText.value = '';
    inputs.ops.forEach(i => i.value = '');
    inputs.correct.value = '';
    inputs.expl.value = '';
}

// ==========================================
// 5. BULK UPLOAD FUNCTION (UPDATED)
// ==========================================
function procBulk() {
    const txt = document.getElementById('bulk-input-textarea').value.trim();
    if(!txt) { show("বক্স খালি!", "error"); return; }

    // ডবল এন্টার দিয়ে ব্লক আলাদা করা
    const blocks = txt.split(/\n\s*\n/);
    let count = 0;

    blocks.forEach((b) => {
        const lines = b.trim().split('\n').map(l=>l.trim()).filter(l=>l);
        
        // মিনিমাম ৫ লাইন দরকার (প্রশ্ন + ৪ অপশন)
        if(lines.length >= 5) {
            const qt = lines[0]; // ১ম লাইন প্রশ্ন
            // অপশন খোঁজা (মাঝখানের লাইনগুলো)
            // আমরা ধরে নিচ্ছি শেষ ২ লাইনের আগেরগুলো অপশন
            
            // উত্তর ও ব্যাখ্যা খোঁজা
            let ansLine = lines.find(l => /^(answer|ans|correct):/i.test(l));
            let expLine = lines.find(l => /^(explanation|exp|ব্যাখ্যা):/i.test(l));
            
            // অপশনগুলো বের করা (যেগুলো Answer বা Explanation নয়)
            let rawOps = lines.slice(1).filter(l => !l.startsWith('Answer:') && !l.startsWith('Ans:') && !l.startsWith('Explanation:') && !l.startsWith('ব্যাখ্যা:'));
            
            // অপশন যদি ৪টি থাকে, তবেই প্রসেস হবে
            if(rawOps.length >= 4 && ansLine) {
                const ops = rawOps.slice(0, 4); // প্রথম ৪টি নিচ্ছি
                
                let rawAns = ansLine.replace(/^(answer|ans|correct):\s*/i, "").trim();
                let explanationText = expLine ? expLine.replace(/^(explanation|exp|ব্যাখ্যা):\s*/i, "").trim() : "";

                let finalAns = null;
                
                // ১. ডাইরেক্ট ম্যাচিং
                const exactMatch = ops.find(o => o.toLowerCase() === rawAns.toLowerCase());
                if(exactMatch) finalAns = exactMatch;
                else {
                    // ২. A/B/C/D ম্যাচিং
                    const map = {'a':0, 'b':1, 'c':2, 'd':3, '1':0, '2':1, '3':2, '4':3};
                    const key = rawAns.toLowerCase().charAt(0);
                    if(map.hasOwnProperty(key)) finalAns = ops[map[key]];
                }

                if(finalAns) {
                    questions.push({ 
                        question: qt, 
                        options: ops, 
                        answer: finalAns,
                        explanation: explanationText 
                    });
                    count++;
                }
            }
        }
    });

    if(count > 0) { 
        render(); 
        document.getElementById('bulk-input-textarea').value=''; 
        show(`${count} টি প্রশ্ন সফলভাবে যোগ হয়েছে!`, "success"); 
    } else { 
        show("ফরম্যাট সঠিক নয় বা কোনো প্রশ্ন পাওয়া যায়নি।", "error"); 
    }
}

// ==========================================
// 6. RENDER LIST & FIREBASE
// ==========================================
function render() {
    const c = document.getElementById('questions-container');
    c.innerHTML = '';
    document.getElementById('questions-list-header').innerText = `প্রশ্ন তালিকা (${questions.length})`;
    
    questions.forEach((q, i) => {
        let explHTML = q.explanation ? `<div style="font-size:0.85rem; color:#555; margin-top:5px; background:#f1f8e9; padding:5px;">💡 <b>Note:</b> ${q.explanation}</div>` : '';
        
        c.innerHTML += `
            <div class="q-card">
                <div class="q-header">
                    <span class="q-text">Q${i+1}. ${q.question}</span>
                    <div class="card-actions">
                        <span class="action-btn btn-edit" onclick="editQ(${i})">Edit</span>
                        <span class="action-btn btn-delete" onclick="delQ(${i})">Del</span>
                    </div>
                </div>
                <div style="font-size:0.9rem; color:#2e7d32;">✔ উত্তর: ${q.answer}</div>
                ${explHTML}
            </div>
        `;
    });
    // MathJax Render
    if(window.renderMathInElement) renderMathInElement(c);
}

function saveFirebase() {
    const id = inputs.id.value.trim();
    if(!id || questions.length===0) return show("Quiz ID এবং অন্তত ১টি প্রশ্ন থাকতে হবে!", "error");

    show("সেভ হচ্ছে...", "success");
    
    const quizData = {
        title: inputs.title.value.trim() || "Mock Test",
        time: parseInt(inputs.time.value) || 30,
        positive: parseFloat(inputs.marks.value) || 1,
        negative: parseFloat(inputs.neg.value) || 0,
        passMark: parseInt(inputs.pass.value) || 40,
        questions: questions,
        totalQuestions: questions.length
    };

    database.ref('quizzes/'+id).set(quizData)
    .then(() => {
        show("সফলভাবে সেভ হয়েছে!", "success");
        const url = window.location.href.replace('admin.html', 'index.html').split('?')[0] + '?quiz=' + id;
        document.getElementById('generated-link').value = url;
        document.getElementById('share-link-box').style.display = 'block';
    })
    .catch(e => show("Error: " + e.message, "error"));
}

function loadFirebase() {
    const id = inputs.id.value.trim();
    if(!id) return show("ID দিন", "error");
    
    show("লোড হচ্ছে...", "success");
    database.ref('quizzes/'+id).once('value', s => {
        const d = s.val();
        if(d) {
            inputs.title.value = d.title || "";
            inputs.time.value = d.time || 30;
            inputs.marks.value = d.positive || 1;
            inputs.neg.value = d.negative || 0;
            inputs.pass.value = d.passMark || 40;
            questions = d.questions || [];
            render();
            show("কুইজ লোড হয়েছে!", "success");
        } else {
            show("এই ID দিয়ে কোনো কুইজ নেই!", "error");
        }
    });
}

// কপি লিংক ফাংশন
function copyToClipboard() {
    const copyText = document.getElementById("generated-link");
    copyText.select();
    document.execCommand("copy");
    show("লিংক কপি হয়েছে!", "success");
}

// টোস্ট মেসেজ দেখানো
function show(msg, type) {
    statusMsg.innerText = msg;
    statusMsg.className = type; // success or error
    statusMsg.style.display = 'block';
    setTimeout(() => statusMsg.style.display = 'none', 3000);
}
