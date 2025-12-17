// আপনার Firebase প্রোজেক্ট কনফিগারেশন
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

// Firebase ইনিশিয়ালাইজ করুন
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const QUIZ_ID = urlParams.get('quiz');

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let skippedCount = 0;
let questionTimerInterval;
const questionTimeLimit = 30;
let questionTimeLeft;
let userName = '';
let quizAttemptKey = null;

// DOM Elements
const splashScreen = document.getElementById('splashScreen');
const nameInputScreen = document.getElementById('nameInputScreen');
const userNameInput = document.getElementById('userNameInput');
const proceedToStartScreenButton = document.getElementById('proceedToStartScreenButton');
const nameInputMessage = document.getElementById('nameInputMessage');
const checkScoresButton = document.getElementById('checkScoresButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const totalQuestionsInfo = document.getElementById('totalQuestionsInfo');
const fullMarksInfo = document.getElementById('fullMarksInfo');
const timeLimitInfo = document.getElementById('timeLimitInfo');
const quizScreen = document.getElementById('quizScreen');
const resultScreen = document.getElementById('resultScreen');
const resultSummary = document.getElementById('resultSummary');
const detailedAnswersContainer = document.getElementById('detailedAnswersContainer');
const personalScoresSection = document.getElementById('personalScoresSection');
const personalScoresTitle = document.getElementById('personalScoresTitle');
const personalScoresList = document.getElementById('personalScoresList');
const scoreDisplayElem = document.getElementById('scoreDisplay');
const questionIndexDisplayElem = document.getElementById('questionIndexDisplay');
const questionTextBox = document.getElementById('questionTextBox');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackMessage = document.getElementById('feedbackMessage');
const nextButton = document.getElementById('nextButton');
const skipButton = document.getElementById('skipButton');
const submitButton = document.getElementById('submitButton');
const questionTimerTextElem = document.getElementById('questionTimer');
const progressRingBar = document.querySelector('.progress-ring-bar');
const rankListElem = document.getElementById('rankList');
const showAllAnswersButton = document.getElementById('showAllAnswersButton');
const showCorrectAnswersButton = document.getElementById('showCorrectAnswersButton');
const showWrongAnswersButton = document.getElementById('showWrongAnswersButton');
const showSkippedQuestionsButton = document.getElementById('showSkippedQuestionsButton');
const backToResultsButton = document.getElementById('backToResultsButton');
const detailedAnswersTitle = document.getElementById('detailedAnswersTitle');
const questionsList = document.getElementById('questionsList');

const circumference = 2 * Math.PI * 35;
if (progressRingBar) {
    progressRingBar.style.strokeDasharray = circumference;
    progressRingBar.style.strokeDashoffset = circumference;
}

// --- হেল্পার ফাংশন: ম্যাথ রেন্ডার করার জন্য ---
function renderMath(element) {
    if (typeof renderMathInElement === 'function' && element) {
        renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (QUIZ_ID) {
        fetchQuizDataAndShowSplash();
    } else {
        document.body.innerHTML = "<h1>Error: কোনো কুইজ নির্বাচন করা হয়নি। URL-এ ?quiz=QUIZ_ID যোগ করুন।</h1>";
        if(splashScreen) splashScreen.style.display = 'none';
    }
});

if(proceedToStartScreenButton) proceedToStartScreenButton.addEventListener('click', validateNameAndStartQuiz);
if(startButton) startButton.addEventListener('click', showNameInputScreen);
if(checkScoresButton) checkScoresButton.addEventListener('click', validateNameAndShowScores);
if(nextButton) nextButton.addEventListener('click', handleNextQuestion);
if(skipButton) skipButton.addEventListener('click', handleSkipQuestion);
if(submitButton) submitButton.addEventListener('click', handleSubmitQuiz);
if(showAllAnswersButton) showAllAnswersButton.addEventListener('click', () => displayDetailedQuestions('all'));
if(showCorrectAnswersButton) showCorrectAnswersButton.addEventListener('click', () => displayDetailedQuestions('correct'));
if(showWrongAnswersButton) showWrongAnswersButton.addEventListener('click', () => displayDetailedQuestions('wrong'));
if(showSkippedQuestionsButton) showSkippedQuestionsButton.addEventListener('click', () => displayDetailedQuestions('skipped'));
if(backToResultsButton) backToResultsButton.addEventListener('click', backToSummaryScreen);

function fetchQuizDataAndShowSplash() {
    database.ref('quizzes/' + QUIZ_ID).once('value', (snapshot) => {
        const quizData = snapshot.val();
        if (quizData && quizData.questions) {
            questions = quizData.questions;
            const titleElem = document.getElementById('startScreen').querySelector('h1');
            if(titleElem) titleElem.textContent = quizData.title || "Quiz";
            totalQuestionsInfo.textContent = questions.length;
            fullMarksInfo.textContent = questions.length;
            timeLimitInfo.textContent = Math.ceil(questions.length * questionTimeLimit / 60);
            splashScreen.classList.add('active');
            setTimeout(() => {
                splashScreen.classList.remove('active');
                startScreen.classList.add('active');
            }, 2000);
        } else {
            document.body.innerHTML = `<h1>Error: '${QUIZ_ID}' নামের কোনো কুইজ খুঁজে পাওয়া যায়নি।</h1>`;
            splashScreen.style.display = 'none';
        }
    }).catch((error) => {
        console.error("Firebase Error:", error);
        document.body.innerHTML = "<h1>Error: কুইজ লোড করা যায়নি।</h1>";
    });
}

// --- Shuffle Function (ওলটপালট করার ফাংশন) ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function validateNameAndStartQuiz() {
    const inputName = userNameInput.value.trim();
    if (inputName === '') {
        nameInputMessage.textContent = "আপনার নাম লিখুন।";
        return;
    }
    userName = inputName;
    nameInputMessage.textContent = '';
    startQuiz();
}

function validateNameAndShowScores() {
    const inputName = userNameInput.value.trim();
    if (inputName === '') {
        nameInputMessage.textContent = "স্কোর দেখার জন্য নাম লিখুন।";
        return;
    }
    userName = inputName;
    nameInputMessage.textContent = '';
    fetchAndShowScores(userName);
}

function showNameInputScreen() {
    startScreen.classList.remove('active');
    nameInputScreen.classList.add('active');
}

function startQuiz() { 
    // --- Shuffle Enabled Here (চালু করা হয়েছে) ---
    shuffleArray(questions); 
    questions.forEach(q => shuffleArray(q.options)); 

    nameInputScreen.classList.remove('active');
    quizScreen.classList.add('active');

    quizAttemptKey = database.ref('quizResults/' + QUIZ_ID).push().key;

    resetQuizState(); 
    loadQuestion();
    scoreDisplayElem.textContent = score;
}

function resetQuizState() {
    currentQuestionIndex = 0;
    score = 0;
    correctCount = 0;
    wrongCount = 0;
    skippedCount = 0;
    questions.forEach(q => {
        q.userAnswer = null;
        q.status = null;
    });
    clearInterval(questionTimerInterval);
}

function updateQuestionTimerDisplay() {
    const newCircumference = 2 * Math.PI * 40; 
    questionTimerTextElem.textContent = questionTimeLeft;
    const offset = circumference - (questionTimeLeft / questionTimeLimit) * circumference;
    progressRingBar.style.strokeDashoffset = offset;
    if (questionTimeLeft <= 10) {
        progressRingBar.style.stroke = '#FF6347';
    } else if (questionTimeLeft <= 20) {
        progressRingBar.style.stroke = '#FFD700';
    } else {
        progressRingBar.style.stroke = '#28a745';
    }
}

function startQuestionTimer() {
    clearInterval(questionTimerInterval);
    questionTimeLeft = questionTimeLimit;
    updateQuestionTimerDisplay();
    questionTimerInterval = setInterval(() => {
        questionTimeLeft--;
        updateQuestionTimerDisplay();
        if (questionTimeLeft <= 0) {
            clearInterval(questionTimerInterval);
            if (questions[currentQuestionIndex].status === null) handleTimeUp();
        }
    }, 1000);
}

function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        handleSubmitQuiz();
        return;
    }
    clearInterval(questionTimerInterval);
    startQuestionTimer();

    const currentQuestion = questions[currentQuestionIndex];
    questionIndexDisplayElem.textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
    questionTextBox.innerHTML = currentQuestion.question;
    optionsContainer.innerHTML = '';
    questionTextBox.classList.remove('active');
    void questionTextBox.offsetWidth; 
    questionTextBox.classList.add('active');
    feedbackMessage.textContent = '';
    selectedOption = null;
    nextButton.style.display = 'none';
    skipButton.style.display = 'inline-block';
    submitButton.style.display = 'none';
    if (currentQuestionIndex === questions.length - 1) {
        submitButton.style.display = 'inline-block';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
    }

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option');
        button.innerHTML = option;
        button.addEventListener('click', () => selectOption(button, option));
        optionsContainer.appendChild(button);
        setTimeout(() => button.classList.add('active'), index * 100);
    });

    // --- Math Rendering Call ---
    renderMath(quizScreen);
}

function selectOption(selectedButton, selectedAnswer) {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.status !== null) return;
    clearInterval(questionTimerInterval);
    disableOptions();
    const correctAnswer = currentQuestion.answer;
    currentQuestion.userAnswer = selectedAnswer;
    selectedButton.classList.add('selected');

    if (selectedAnswer === correctAnswer) {
        selectedButton.classList.add('correct');
        score += 1;
        correctCount++;
        currentQuestion.status = 'correct';
    } else {
        if ("vibrate" in navigator) navigator.vibrate(200);
        selectedButton.classList.add('wrong');
        wrongCount++;
        Array.from(optionsContainer.children).forEach(optionBtn => {
            if (optionBtn.innerHTML === correctAnswer) optionBtn.classList.add('correct');
        });
        currentQuestion.status = 'wrong';
    }
    scoreDisplayElem.textContent = score.toFixed(2);
    nextButton.style.display = 'inline-block';
    skipButton.style.display = 'none';
    submitButton.style.display = (currentQuestionIndex === questions.length - 1) ? 'inline-block' : 'none';
    updatePartialProgress('incomplete');
}

function handleTimeUp() {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.status !== null) return;
    skippedCount++;
    currentQuestion.status = 'skipped';
    currentQuestion.userAnswer = 'কোনো উত্তর দেওয়া হয়নি';
    updatePartialProgress('incomplete');
    showAnswer();
    disableOptions();
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 2000);
}

function showAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.answer;
    Array.from(optionsContainer.children).forEach(optionBtn => {
        optionBtn.style.pointerEvents = 'none';
        if (optionBtn.innerHTML === correctAnswer) optionBtn.classList.add('correct');
    });
    nextButton.style.display = 'inline-block';
    skipButton.style.display = 'none';
    submitButton.style.display = (currentQuestionIndex === questions.length - 1) ? 'inline-block' : 'none';
}

function disableOptions() {
    Array.from(optionsContainer.children).forEach(opt => opt.style.pointerEvents = 'none');
}

function handleNextQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.status === null) {
        clearInterval(questionTimerInterval);
        skippedCount++;
        currentQuestion.status = 'skipped';
        currentQuestion.userAnswer = 'কোনো উত্তর দেওয়া হয়নি';
        updatePartialProgress('incomplete');
        showAnswer();
        disableOptions();
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestion();
        }, 1000);
    } else {
        currentQuestionIndex++;
        loadQuestion();
    }
}

function handleSkipQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.status !== null) return;
    clearInterval(questionTimerInterval);
    skippedCount++;
    currentQuestion.status = 'skipped';
    currentQuestion.userAnswer = 'কোনো উত্তর দেওয়া হয়নি';
    updatePartialProgress('incomplete');
    showAnswer();
    disableOptions();
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1000);
}

function handleSubmitQuiz() {
    clearInterval(questionTimerInterval);
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');
    detailedAnswersContainer.style.display = 'none';
    resultSummary.style.display = 'block';
    personalScoresSection.style.display = 'none';
    document.querySelector('.ranking-section').style.display = 'block';

    const totalPossibleScore = questions.length;
    const yourPercentage = (totalPossibleScore > 0) ? (score / totalPossibleScore) * 100 : 0;
    document.getElementById('finalTotalQuestions').textContent = questions.length;
    document.getElementById('correctAnswers').textContent = correctCount;
    document.getElementById('wrongAnswers').textContent = wrongCount;
    document.getElementById('skippedQuestions').textContent = skippedCount;
    document.getElementById('finalScore').textContent = score.toFixed(2);
    document.getElementById('yourPercentage').textContent = yourPercentage.toFixed(2) + '%';
    const percentageBarFill = document.getElementById('percentageBarFill');
    percentageBarFill.style.width = `${yourPercentage}%`;
    percentageBarFill.style.backgroundColor = yourPercentage >= 50 ? '#28a745' : '#dc3545';
    updatePartialProgress('complete');
    displayRankings();
}

function updatePartialProgress(status = 'incomplete') {
    if (!userName || !quizAttemptKey || !QUIZ_ID) return;
    const totalPossibleScore = questions.length;
    const yourPercentage = (totalPossibleScore > 0) ? (score / totalPossibleScore) * 100 : 0;
    const resultData = {
        name: userName,
        score: score.toFixed(2),
        correct: correctCount,
        wrong: wrongCount,
        skipped: skippedCount,
        totalQuestions: questions.length,
        percentage: yourPercentage.toFixed(2),
        status: status,
        lastQuestionIndex: currentQuestionIndex,
        timestamp: new Date().toISOString()
    };
    database.ref('quizResults/' + QUIZ_ID + '/' + quizAttemptKey).set(resultData);
}

function displayRankings() {
    if (!QUIZ_ID) {
        rankListElem.innerHTML = '<li>Quiz ID নেই।</li>';
        return;
    }
    rankListElem.innerHTML = '<li>লোড হচ্ছে...</li>';
    database.ref('quizResults/' + QUIZ_ID).once('value', (snapshot) => {
        const userHighestScores = {}; 
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.status !== 'complete' || !data.name) return;
            const userScore = parseFloat(data.score);
            if (!userHighestScores[data.name] || userScore > userHighestScores[data.name].score) {
                userHighestScores[data.name] = { name: data.name, score: userScore };
            }
        });
        const rankings = Object.values(userHighestScores).sort((a, b) => b.score - a.score);
        rankListElem.innerHTML = '';
        if (rankings.length === 0) {
            rankListElem.innerHTML = '<li>কোনো রেকর্ড নেই।</li>';
        } else {
            rankings.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. ${entry.name} - স্কোর: ${entry.score.toFixed(2)}`;
                rankListElem.appendChild(li);
            });
        }
    });
}

function fetchAndShowScores(name) {
    nameInputScreen.classList.remove('active');
    resultScreen.classList.add('active');
    resultSummary.style.display = 'none';
    detailedAnswersContainer.style.display = 'none';
    personalScoresSection.style.display = 'block';
    personalScoresTitle.textContent = `${name}-এর পূর্ববর্তী স্কোর`;
    personalScoresList.innerHTML = '<li>লোড হচ্ছে...</li>';
    displayRankings();
    database.ref('quizResults/' + QUIZ_ID).orderByChild('name').equalTo(name).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            personalScoresList.innerHTML = '<li>কোনো স্কোর পাওয়া যায়নি।</li>';
            return;
        }
        const scores = [];
        snapshot.forEach(c => scores.push(c.val()));
        scores.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        personalScoresList.innerHTML = '';
        scores.forEach(entry => {
            const li = document.createElement('li');
            const date = new Date(entry.timestamp).toLocaleString('bn-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            li.textContent = `স্কোর: ${entry.score} (${entry.status === 'complete' ? 'সম্পূর্ণ' : 'অসম্পূর্ণ'}) - ${date}`;
            personalScoresList.appendChild(li);
        });
    });
}

function displayDetailedQuestions(category) {
    resultSummary.style.display = 'none';
    personalScoresSection.style.display = 'none';
    detailedAnswersContainer.style.display = 'block';
    questionsList.innerHTML = '';
    let titleText = 'সমস্ত প্রশ্ন';
    let filteredQuestions = questions;
    if (category === 'correct') {
        titleText = 'সঠিক উত্তরসমূহ';
        filteredQuestions = questions.filter(q => q.status === 'correct');
    } else if (category === 'wrong') {
        titleText = 'ভুল উত্তরসমূহ';
        filteredQuestions = questions.filter(q => q.status === 'wrong');
    } else if (category === 'skipped') {
        titleText = 'বাদ পড়া প্রশ্নসমূহ';
        filteredQuestions = questions.filter(q => q.status === 'skipped');
    }
    detailedAnswersTitle.textContent = titleText;
    if (filteredQuestions.length === 0) {
        questionsList.innerHTML = `<li>এই ক্যাটাগরিতে কোনো প্রশ্ন নেই।</li>`;
        return;
    }
    filteredQuestions.forEach((q, index) => {
        const li = document.createElement('li');
        li.classList.add('detailed-question-item'); 
        let statusClass = q.status === 'correct' ? 'correct-status' : (q.status === 'wrong' ? 'wrong-status' : 'skipped-status');
        let statusText = q.status === 'correct' ? '(Correct)' : (q.status === 'wrong' ? '(Wrong)' : '(Skipped)');
        const qNum = questions.indexOf(q) + 1;
        let html = `
            <div class="question-header">
                <span class="question-number">${qNum}.</span>
                <span class="question-text">${q.question}</span>
                <span class="status-indicator ${statusClass}">${statusText}</span>
            </div>
            <ul class="detailed-options">
        `;
        q.options.forEach(opt => {
            let cls = '';
            if (q.userAnswer === opt) cls = q.status === 'correct' ? 'selected-correct' : 'selected-wrong';
            if (opt === q.answer && q.status !== 'correct') cls += ' correct-answer-highlight';
            html += `<li class="${cls}">${opt}</li>`;
        });
        html += `</ul>`;
        li.innerHTML = html;
        questionsList.appendChild(li);
    });
    
    // --- Math Rendering ---
    renderMath(detailedAnswersContainer);
}

function backToSummaryScreen() {
    detailedAnswersContainer.style.display = 'none';
    personalScoresSection.style.display = 'none';
    resultSummary.style.display = 'block';
}
