// Firebase Config
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
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0; let wrongCount = 0; let skippedCount = 0;
let timerInterval; const TIME_LIMIT = 30; let timeLeft;

// Listeners
document.addEventListener('DOMContentLoaded', () => {
    if(!QUIZ_ID) return document.body.innerHTML = "<h1>Error: Quiz ID Missing!</h1>";
    
    // Auth Check
    auth.onAuthStateChanged(user => {
        if(user) {
            currentUser = user;
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'none';
            loadQuizData();
        } else {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }
    });
});

document.getElementById('googleLoginBtn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert(e.message));
});

window.logout = () => auth.signOut().then(() => location.reload());

document.getElementById('startButton').addEventListener('click', startQuiz);
document.getElementById('reattemptBtn').addEventListener('click', startQuiz);
document.getElementById('nextButton').addEventListener('click', nextQuestion);
document.getElementById('skipButton').addEventListener('click', skipQuestion);
document.getElementById('submitButton').addEventListener('click', submitQuiz);

// Functions
function loadQuizData() {
    // Show Profile
    document.getElementById('userPhoto').src = currentUser.photoURL;
    document.getElementById('userNameDisplay').innerText = currentUser.displayName.split(' ')[0];
    document.getElementById('startScreen').classList.add('active');

    // Fetch Quiz
    database.ref('quizzes/' + QUIZ_ID).once('value', s => {
        const d = s.val();
        if(!d) return alert("Quiz not found!");
        
        questions = d.questions || [];
        document.querySelector('#startScreen h1').innerText = d.title;
        document.getElementById('totalQuestionsInfo').innerText = questions.length;
        document.getElementById('fullMarksInfo').innerText = questions.length;
        document.getElementById('timeLimitInfo').innerText = Math.ceil(questions.length * 0.5);

        // Check Previous Attempt
        checkHistory();
    });
}

function checkHistory() {
    database.ref(`users/${currentUser.uid}/results/${QUIZ_ID}`).once('value', s => {
        if(s.exists()) {
            const res = s.val();
            document.getElementById('previousScoreBox').style.display = 'block';
            document.getElementById('prevScoreVal').innerText = `${res.score} / ${res.total}`;
            document.getElementById('startButton').style.display = 'none';
        } else {
            document.getElementById('startButton').style.display = 'block';
        }
    });
}

function startQuiz() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('quizScreen').classList.add('active');
    
    // Reset
    currentQuestionIndex = 0; score = 0; correctCount = 0; wrongCount = 0; skippedCount = 0;
    
    // Shuffle
    questions.sort(() => Math.random() - 0.5);
    questions.forEach(q => q.options.sort(() => Math.random() - 0.5));

    loadQuestion();
}

function loadQuestion() {
    if(currentQuestionIndex >= questions.length) return submitQuiz();
    
    clearInterval(timerInterval);
    startTimer();

    const q = questions[currentQuestionIndex];
    document.getElementById('questionIndexDisplay').innerText = `${currentQuestionIndex+1} / ${questions.length}`;
    document.getElementById('questionTextBox').innerHTML = q.question;
    document.getElementById('scoreDisplay').innerText = score;
    
    const optsDiv = document.getElementById('optionsContainer');
    optsDiv.innerHTML = '';
    
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option';
        btn.innerText = opt;
        btn.onclick = () => selectOption(btn, opt, q.answer);
        optsDiv.appendChild(btn);
    });

    document.getElementById('nextButton').style.display = 'none';
    document.getElementById('skipButton').style.display = 'inline-block';
    
    if(window.renderMathInElement) renderMathInElement(document.body);
}

function startTimer() {
    timeLeft = TIME_LIMIT;
    document.getElementById('questionTimer').innerText = timeLeft;
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('questionTimer').innerText = timeLeft;
        if(timeLeft <= 0) skipQuestion();
    }, 1000);
}

function selectOption(btn, selected, correct) {
    clearInterval(timerInterval);
    const allBtns = document.querySelectorAll('.option');
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    questions[currentQuestionIndex].userAnswer = selected;
    
    if(selected === correct) {
        btn.classList.add('correct');
        score++; correctCount++;
        questions[currentQuestionIndex].status = 'correct';
    } else {
        btn.classList.add('wrong');
        wrongCount++;
        questions[currentQuestionIndex].status = 'wrong';
        // Show correct
        allBtns.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
    }

    document.getElementById('nextButton').style.display = 'inline-block';
    document.getElementById('skipButton').style.display = 'none';
    if(currentQuestionIndex === questions.length-1) {
        document.getElementById('nextButton').style.display = 'none';
        document.getElementById('submitButton').style.display = 'inline-block';
    }
}

function skipQuestion() {
    clearInterval(timerInterval);
    questions[currentQuestionIndex].status = 'skipped';
    questions[currentQuestionIndex].userAnswer = null;
    skippedCount++;
    nextQuestion();
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function submitQuiz() {
    clearInterval(timerInterval);
    document.getElementById('quizScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.add('active');

    // Calc
    const total = questions.length;
    const percentage = (score / total) * 100;
    
    // UI Update
    document.getElementById('finalScore').innerText = score;
    document.getElementById('correctAnswers').innerText = correctCount;
    document.getElementById('wrongAnswers').innerText = wrongCount;
    document.getElementById('skippedQuestions').innerText = skippedCount;
    document.getElementById('finalTotalQuestions').innerText = total;
    document.getElementById('yourPercentage').innerText = percentage.toFixed(1) + '%';
    document.getElementById('percentageBarFill').style.width = percentage + '%';

    // Pass/Fail Logic (Assume 40% Pass)
    const badge = document.getElementById('passFailBadge');
    badge.style.display = 'block';
    if(percentage >= 40) {
        badge.innerText = "🎉 PASSED";
        badge.style.background = "#2ecc71";
    } else {
        badge.innerText = "❌ FAILED";
        badge.style.background = "#e74c3c";
    }

    // Save to Firebase (User History)
    database.ref(`users/${currentUser.uid}/results/${QUIZ_ID}`).set({
        score: score,
        total: total,
        percentage: percentage.toFixed(1),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Save to Global Leaderboard
    database.ref(`quizResults/${QUIZ_ID}/${currentUser.uid}`).set({
        name: currentUser.displayName,
        score: score,
        photo: currentUser.photoURL
    });

    loadRankings();
}

function loadRankings() {
    const list = document.getElementById('rankList');
    list.innerHTML = "<li>Loading...</li>";
    
    database.ref(`quizResults/${QUIZ_ID}`).orderByChild('score').limitToLast(10).once('value', s => {
        list.innerHTML = "";
        const data = [];
        s.forEach(c => data.push(c.val()));
        data.reverse().forEach((p, i) => {
            list.innerHTML += `<li>#${i+1} ${p.name.split(' ')[0]} - Score: ${p.score}</li>`;
        });
    });
}

// Show Answers Logic
document.getElementById('showAllAnswersButton').addEventListener('click', () => showDetails('all'));
document.getElementById('showCorrectAnswersButton').addEventListener('click', () => showDetails('correct'));
document.getElementById('showWrongAnswersButton').addEventListener('click', () => showDetails('wrong'));
document.getElementById('backToResultsButton').addEventListener('click', () => {
    document.getElementById('detailedAnswersContainer').style.display = 'none';
    document.getElementById('resultSummary').style.display = 'block';
});

function showDetails(filter) {
    document.getElementById('resultSummary').style.display = 'none';
    const cont = document.getElementById('detailedAnswersContainer');
    cont.style.display = 'block';
    const ul = document.getElementById('questionsList');
    ul.innerHTML = '';

    questions.forEach((q, i) => {
        if(filter !== 'all' && q.status !== filter) return;

        let statusColor = q.status === 'correct' ? 'green' : (q.status === 'wrong' ? 'red' : 'orange');
        let html = `
            <div style="background:#f9f9f9; padding:10px; margin-bottom:10px; border-left:5px solid ${statusColor}">
                <p><strong>Q${i+1}.</strong> ${q.question}</p>
                <p style="color:green">✔ সঠিক: ${q.answer}</p>
                <p style="color:${q.status==='correct'?'green':'red'}">👤 আপনার উত্তর: ${q.userAnswer || 'Skipped'}</p>
            </div>
        `;
        ul.innerHTML += html;
    });
    if(window.renderMathInElement) renderMathInElement(ul);
}
