// Firebase Config (Keep same as yours)
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
const auth = firebase.auth();

// Variables
const urlParams = new URLSearchParams(window.location.search);
const QUIZ_ID = urlParams.get('quiz');
let currentUser = null;
let quizData = {};
let currentQIndex = 0;
let score = 0;
let timerInterval;

// Auth & Load
document.addEventListener('DOMContentLoaded', () => {
    if(!QUIZ_ID) return document.body.innerHTML = "<h1>Error: Quiz ID Missing!</h1>";
    auth.onAuthStateChanged(user => {
        if(user) {
            currentUser = user;
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'none';
            loadQuiz();
        } else {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }
    });
});

document.getElementById('googleLoginBtn').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
});

function loadQuiz() {
    document.getElementById('userPhoto').src = currentUser.photoURL;
    document.getElementById('userNameDisplay').innerText = currentUser.displayName.split(' ')[0];
    document.getElementById('startScreen').classList.add('active');

    database.ref('quizzes/' + QUIZ_ID).once('value', s => {
        quizData = s.val();
        if(!quizData) return alert("Quiz Not Found");
        
        // Settings Defaults
        quizData.time = quizData.time || 30;
        quizData.positive = parseFloat(quizData.positive) || 1;
        quizData.negative = parseFloat(quizData.negative) || 0;
        quizData.questions = quizData.questions || [];

        // Display Info
        document.querySelector('#startScreen h1').innerText = quizData.title;
        document.getElementById('totalQuestionsInfo').innerText = quizData.questions.length;
        document.getElementById('fullMarksInfo').innerText = (quizData.questions.length * quizData.positive);
        document.getElementById('timeLimitInfo').innerText = quizData.time + " Min";
        
        // Show Negative Marking Alert
        if(quizData.negative > 0) {
            document.getElementById('fullMarksInfo').innerHTML += ` <span style='color:red; font-size:0.8rem;'>(Neg: -${quizData.negative})</span>`;
        }
    });
}

// Start Quiz
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('quizScreen').classList.add('active');
    
    // Shuffle
    quizData.questions.sort(() => Math.random() - 0.5);
    
    // Start Timer (Seconds)
    let timeLeft = quizData.time * 60; 
    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        document.getElementById('questionTimer').innerText = `${min}:${sec < 10 ? '0'+sec : sec}`;
        if(timeLeft <= 0) submitQuiz();
    }, 1000);

    loadQ();
});

function loadQ() {
    if(currentQIndex >= quizData.questions.length) return submitQuiz();
    
    const q = quizData.questions[currentQIndex];
    document.getElementById('questionIndexDisplay').innerText = `${currentQIndex+1} / ${quizData.questions.length}`;
    document.getElementById('questionTextBox').innerHTML = q.question;
    document.getElementById('scoreDisplay').innerText = score.toFixed(2);
    
    const div = document.getElementById('optionsContainer');
    div.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option';
        btn.innerText = opt;
        btn.onclick = () => selectOpt(btn, opt, q);
        div.appendChild(btn);
    });
    if(window.renderMathInElement) renderMathInElement(document.body);
}

function selectOpt(btn, selected, q) {
    const all = document.querySelectorAll('.option');
    all.forEach(b => b.style.pointerEvents = 'none');
    
    q.userAnswer = selected;
    
    if(selected === q.answer) {
        btn.classList.add('correct');
        score += quizData.positive;
        q.status = 'correct';
    } else {
        btn.classList.add('wrong');
        score -= quizData.negative; // Negative Marking Applied
        if(score < 0) score = 0; // Optional: Prevent negative total score? usually kept
        q.status = 'wrong';
        all.forEach(b => { if(b.innerText === q.answer) b.classList.add('correct'); });
    }
    
    setTimeout(() => {
        currentQIndex++;
        loadQ();
    }, 1000);
}

document.getElementById('skipButton').addEventListener('click', () => {
    quizData.questions[currentQIndex].status = 'skipped';
    currentQIndex++;
    loadQ();
});

function submitQuiz() {
    clearInterval(timerInterval);
    document.getElementById('quizScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.add('active');

    const totalMarks = quizData.questions.length * quizData.positive;
    const percentage = (score / totalMarks) * 100;
    
    // Stats
    const correct = quizData.questions.filter(q => q.status === 'correct').length;
    const wrong = quizData.questions.filter(q => q.status === 'wrong').length;
    
    document.getElementById('finalScore').innerText = score.toFixed(2) + " / " + totalMarks;
    document.getElementById('correctAnswers').innerText = correct;
    document.getElementById('wrongAnswers').innerText = wrong;
    document.getElementById('yourPercentage').innerText = percentage.toFixed(1) + '%';
    document.getElementById('percentageBarFill').style.width = percentage + '%';

    // Save
    database.ref(`users/${currentUser.uid}/results/${QUIZ_ID}`).set({
        score: score.toFixed(2),
        total: totalMarks,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

// Result Buttons
document.getElementById('showAllAnswersButton').addEventListener('click', () => showList('all'));
document.getElementById('showCorrectAnswersButton').addEventListener('click', () => showList('correct'));
document.getElementById('showWrongAnswersButton').addEventListener('click', () => showList('wrong'));
document.getElementById('backToResultsButton').addEventListener('click', () => {
    document.getElementById('detailedAnswersContainer').style.display='none';
    document.getElementById('resultSummary').style.display='block';
});

function showList(filter) {
    document.getElementById('resultSummary').style.display='none';
    document.getElementById('detailedAnswersContainer').style.display='block';
    const ul = document.getElementById('questionsList');
    ul.innerHTML = '';
    
    quizData.questions.forEach((q, i) => {
        if(filter !== 'all' && q.status !== filter) return;
        
        let color = q.status === 'correct' ? '#e8f5e9' : (q.status === 'wrong' ? '#ffebee' : '#fff3e0');
        let expl = q.explanation ? `<div style="margin-top:5px; font-size:0.9rem; color:#444;">💡 <b>Note:</b> ${q.explanation}</div>` : '';

        ul.innerHTML += `
            <div style="background:${color}; padding:10px; margin-bottom:10px; border-radius:5px;">
                <p><strong>Q${i+1}.</strong> ${q.question}</p>
                <p style="color:green">✔ Ans: ${q.answer}</p>
                <p style="color:${q.status==='wrong'?'red':'#555'}">👤 You: ${q.userAnswer || 'Skipped'}</p>
                ${expl}
            </div>`;
    });
    if(window.renderMathInElement) renderMathInElement(ul);
}
