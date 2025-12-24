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

// Inputs
const inputs = {
    id: document.getElementById('quiz-id-input'),
    title: document.getElementById('quiz-title-input'),
    time: document.getElementById('time-input'),
    marks: document.getElementById('marks-input'),
    neg: document.getElementById('negative-input'),
    pass: document.getElementById('pass-mark-input'),
    qText: document.getElementById('question-text-input'),
    ops: [
        document.getElementById('option1-input'),
        document.getElementById('option2-input'),
        document.getElementById('option3-input'),
        document.getElementById('option4-input')
    ],
    correct: document.getElementById('correct-option-select'),
    expl: document.getElementById('explanation-input')
};

let questions = [];
let editIdx = -1;

// Listeners
document.getElementById('add-question-btn').addEventListener('click', addQ);
document.getElementById('update-question-btn').addEventListener('click', updQ);
document.getElementById('save-quiz-btn').addEventListener('click', saveFirebase);
document.getElementById('load-quiz-btn').addEventListener('click', loadFirebase);

// Logic
function addQ() {
    const q = inputs.qText.value.trim();
    const ops = inputs.ops.map(i => i.value.trim());
    const c = inputs.correct.value;
    const ex = inputs.expl.value.trim();

    if(!q || ops.some(o=>!o) || !c) return alert("সব তথ্য দিন!");
    
    questions.push({ question: q, options: ops, answer: ops[parseInt(c)], explanation: ex });
    render(); clear();
}

function render() {
    const c = document.getElementById('questions-container');
    c.innerHTML = '';
    document.getElementById('questions-list-header').innerText = `Total: ${questions.length}`;
    
    questions.forEach((q, i) => {
        c.innerHTML += `
            <div class="q-card">
                <div class="q-header"><b>Q${i+1}. ${q.question}</b> 
                <span style="color:red; cursor:pointer;" onclick="delQ(${i})">Del</span></div>
                <div style="font-size:0.8rem; color:#666;">Ans: ${q.answer}</div>
            </div>`;
    });
    if(window.renderMathInElement) renderMathInElement(c);
}

function clear() {
    inputs.qText.value=''; inputs.ops.forEach(i=>i.value=''); 
    inputs.correct.value=''; inputs.expl.value='';
}

function delQ(i) { questions.splice(i, 1); render(); }

function saveFirebase() {
    const id = inputs.id.value.trim();
    if(!id || questions.length===0) return alert("ID এবং প্রশ্ন দিন!");

    database.ref('quizzes/'+id).set({
        title: inputs.title.value.trim(),
        time: inputs.time.value || 30,         // Time
        positive: inputs.marks.value || 1,     // + Marks
        negative: inputs.neg.value || 0.25,    // - Marks
        passMark: inputs.pass.value || 40,     // Pass %
        questions: questions
    }).then(() => {
        alert("Saved!");
        const url = window.location.href.replace('admin.html', 'index.html').split('?')[0] + '?quiz=' + id;
        document.getElementById('generated-link').value = url;
        document.getElementById('share-link-box').style.display = 'block';
    });
}

function loadFirebase() {
    const id = inputs.id.value.trim();
    if(!id) return alert("ID দিন!");
    
    database.ref('quizzes/'+id).once('value', s => {
        const d = s.val();
        if(!d) return alert("পাওয়া যায়নি!");
        
        inputs.title.value = d.title;
        inputs.time.value = d.time;
        inputs.marks.value = d.positive;
        inputs.neg.value = d.negative;
        inputs.pass.value = d.passMark;
        questions = d.questions || [];
        render();
    });
}
