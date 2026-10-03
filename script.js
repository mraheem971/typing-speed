const WORD_LIST = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "I", 
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", 
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", 
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", 
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", 
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", 
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", 
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", 
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", 
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
];

// DOM Elements
const views = {
    standard: document.getElementById('typing-view'),
    sprint: document.getElementById('typing-view'),
    wordfall: document.getElementById('wordfall-view'),
    learn: document.getElementById('learn-view')
};
const navBtns = document.querySelectorAll('.nav-btn');
const soundToggle = document.getElementById('sound-toggle');
const wordsContainer = document.getElementById('words');
const typingInput = document.getElementById('typing-input');
const wpmDisplay = document.getElementById('wpm');
const accDisplay = document.getElementById('accuracy');
const timeDisplay = document.getElementById('time');
const restartBtn = document.getElementById('restart-btn');
const modal = document.getElementById('results-modal');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const resultWpm = document.getElementById('result-wpm');
const resultAcc = document.getElementById('result-acc');
const resultCorrect = document.getElementById('result-correct');
const resultIncorrect = document.getElementById('result-incorrect');

// Wordfall Elements
const wordfallArea = document.getElementById('wordfall-area');
const wordfallInput = document.getElementById('wordfall-input');
const fallScoreDisplay = document.getElementById('fall-score');
const fallLivesDisplay = document.getElementById('fall-lives');
const startWordfallBtn = document.getElementById('start-wordfall-btn');
const wordfallStart = document.getElementById('wordfall-start');

// App State
let currentMode = 'standard'; // 'standard', 'sprint', 'wordfall'
let soundEnabled = true;

// Standard / Sprint State
let words = [];
let currentWordIndex = 0;
let currentLetterIndex = 0;
let startTime = null;
let timer = null;
let timeLimit = 60; // seconds for standard
let sprintWordLimit = 25; // words for sprint
let timeElapsed = 0;
let correctKeystrokes = 0;
let incorrectKeystrokes = 0;
let testActive = false;

// Audio Context for synthetic clicks
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound() {
    if (!soundEnabled || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playErrorSound() {
    if (!soundEnabled || audioCtx.state === 'suspended') return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// Ensure Audio Context starts on user interaction
document.body.addEventListener('keydown', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.classList.toggle('active', soundEnabled);
    soundToggle.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
});

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        switchMode(mode);
    });
});

function switchMode(mode) {
    currentMode = mode;
    
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    if (mode === 'standard' || mode === 'sprint') {
        views.standard.classList.add('active');
        initTest();
    } else if (mode === 'wordfall') {
        views.wordfall.classList.add('active');
        initWordfall();
    } else if (mode === 'learn') {
        views.learn.classList.add('active');
        if (typeof initLearn === 'function') initLearn();
    }
}

// ----------------------------------------------------
// Standard & Sprint Logic
// ----------------------------------------------------

function getRandomWords(count) {
    const shuffled = [...WORD_LIST].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function initTest() {
    clearInterval(timer);
    testActive = false;
    currentWordIndex = 0;
    currentLetterIndex = 0;
    correctKeystrokes = 0;
    incorrectKeystrokes = 0;
    timeElapsed = 0;
    startTime = null;
    
    modal.classList.remove('show');
    
    if (currentMode === 'standard') {
        words = getRandomWords(300); // Plenty of words for 60s
        timeDisplay.innerText = `${timeLimit}s`;
        document.querySelector('.stat-label').innerText = 'WPM';
    } else {
        words = getRandomWords(sprintWordLimit);
        timeDisplay.innerText = `0/${sprintWordLimit}`;
        timeDisplay.parentElement.querySelector('.stat-label').innerText = 'WORDS';
    }
    
    wpmDisplay.innerText = '0';
    accDisplay.innerText = '100%';
    
    renderWords();
    
    // Focus input
    typingInput.value = '';
    typingInput.focus();
}

function renderWords() {
    wordsContainer.innerHTML = '';
    words.forEach((word, wordIndex) => {
        const wordEl = document.createElement('div');
        wordEl.classList.add('word');
        if (wordIndex === 0) wordEl.classList.add('active');
        
        word.split('').forEach((letter, letterIndex) => {
            const letterEl = document.createElement('span');
            letterEl.classList.add('letter');
            letterEl.innerText = letter;
            if (wordIndex === 0 && letterIndex === 0) {
                letterEl.classList.add('active-letter');
            }
            wordEl.appendChild(letterEl);
        });
        wordsContainer.appendChild(wordEl);
    });
}

function startTimer() {
    startTime = Date.now();
    testActive = true;
    
    timer = setInterval(() => {
        timeElapsed = Math.floor((Date.now() - startTime) / 1000);
        updateStats();
        
        if (currentMode === 'standard') {
            const timeRemaining = timeLimit - timeElapsed;
            timeDisplay.innerText = `${timeRemaining}s`;
            if (timeRemaining <= 0) {
                endTest();
            }
        } else if (currentMode === 'sprint') {
            timeDisplay.innerText = `${currentWordIndex}/${sprintWordLimit}`;
        }
    }, 1000);
}

function updateStats() {
    // WPM calculation: (correct keystrokes / 5) / (time in minutes)
    const minutes = timeElapsed / 60 || (1/60); // avoid div by 0
    const wpm = Math.round((correctKeystrokes / 5) / minutes);
    
    const totalKeystrokes = correctKeystrokes + incorrectKeystrokes;
    const accuracy = totalKeystrokes === 0 ? 100 : Math.round((correctKeystrokes / totalKeystrokes) * 100);
    
    wpmDisplay.innerText = wpm > 0 ? wpm : 0;
    accDisplay.innerText = `${accuracy}%`;
}

typingInput.addEventListener('keydown', (e) => {
    if (currentMode === 'wordfall') return;
    
    // Start test on first valid keypress (not modifiers)
    if (!testActive && e.key.length === 1) {
        startTimer();
    }
    
    if (e.key === 'Tab') {
        e.preventDefault();
        initTest();
        return;
    }
});

typingInput.addEventListener('input', (e) => {
    if (currentMode === 'wordfall' || !testActive && e.target.value.length === 0) return;
    
    const currentWord = words[currentWordIndex];
    const wordEls = wordsContainer.children;
    const currentWordEl = wordEls[currentWordIndex];
    const letterEls = currentWordEl.children;
    
    const typedValue = typingInput.value;
    const lastChar = typedValue.slice(-1);
    const isBackspace = e.inputType === 'deleteContentBackward';
    
    if (!testActive) startTimer();
    
    // Space handling (Next word)
    if (lastChar === ' ') {
        playClickSound();
        typingInput.value = '';
        
        // Check if word has errors
        const isWordCorrect = Array.from(letterEls).every(l => l.classList.contains('correct')) && typedValue.trim().length === currentWord.length;
        
        if (!isWordCorrect) {
            currentWordEl.classList.add('error');
        }
        
        currentWordEl.classList.remove('active');
        Array.from(letterEls).forEach(l => l.classList.remove('active-letter'));
        
        currentWordIndex++;
        currentLetterIndex = 0;
        
        if (currentMode === 'sprint' && currentWordIndex >= sprintWordLimit) {
            endTest();
            return;
        }
        
        if (currentWordIndex < wordEls.length) {
            wordEls[currentWordIndex].classList.add('active');
            wordEls[currentWordIndex].children[0].classList.add('active-letter');
            
            // Auto scroll container
            const offsetTop = wordEls[currentWordIndex].offsetTop;
            if (offsetTop > 40) {
                wordsContainer.style.transform = `translateY(-${offsetTop}px)`;
            }
        }
        return;
    }
    
    if (isBackspace) {
        playClickSound();
        if (currentLetterIndex > 0) {
            currentLetterIndex--;
            letterEls[currentLetterIndex].classList.remove('correct', 'incorrect');
            updateActiveLetter(letterEls, currentLetterIndex);
        }
        return;
    }
    
    // Normal typing
    if (currentLetterIndex < currentWord.length) {
        const expectedLetter = currentWord[currentLetterIndex];
        if (lastChar === expectedLetter) {
            letterEls[currentLetterIndex].classList.add('correct');
            correctKeystrokes++;
            playClickSound();
        } else {
            letterEls[currentLetterIndex].classList.add('incorrect');
            incorrectKeystrokes++;
            playErrorSound();
            currentWordEl.classList.add('shake');
            setTimeout(() => currentWordEl.classList.remove('shake'), 200);
        }
        
        currentLetterIndex++;
        updateActiveLetter(letterEls, currentLetterIndex);
    } else {
        // Typed too many characters
        incorrectKeystrokes++;
        playErrorSound();
        currentWordEl.classList.add('shake');
        setTimeout(() => currentWordEl.classList.remove('shake'), 200);
    }
});

function updateActiveLetter(letterEls, index) {
    Array.from(letterEls).forEach(l => l.classList.remove('active-letter'));
    if (index < letterEls.length) {
        letterEls[index].classList.add('active-letter');
    } else {
        // Cursor at end of word
        const spaceCursor = document.createElement('span');
        spaceCursor.classList.add('letter', 'active-letter');
        letterEls[letterEls.length - 1].parentNode.appendChild(spaceCursor);
        setTimeout(() => spaceCursor.remove(), 50); // Hacky way to flash cursor at end, handled better via css on word
    }
}

function endTest() {
    clearInterval(timer);
    testActive = false;
    typingInput.blur();
    
    const minutes = timeElapsed / 60 || (1/60);
    const wpm = Math.round((correctKeystrokes / 5) / minutes);
    const totalKeystrokes = correctKeystrokes + incorrectKeystrokes;
    const accuracy = totalKeystrokes === 0 ? 100 : Math.round((correctKeystrokes / totalKeystrokes) * 100);
    
    resultWpm.innerText = wpm > 0 ? wpm : 0;
    resultAcc.innerText = `${accuracy}%`;
    
    let correctWords = 0;
    let incorrectWords = 0;
    
    const wordEls = wordsContainer.children;
    for (let i = 0; i < currentWordIndex; i++) {
        if (wordEls[i].classList.contains('error')) {
            incorrectWords++;
        } else {
            correctWords++;
        }
    }
    
    resultCorrect.innerText = correctWords;
    resultIncorrect.innerText = incorrectWords;
    
    modal.classList.add('show');
}

restartBtn.addEventListener('click', initTest);
modalRestartBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    if(currentMode === 'wordfall') {
        initWordfall();
    } else {
        initTest();
    }
});

// Click on typing area to focus input
document.getElementById('typing-view').addEventListener('click', () => {
    if(currentMode !== 'wordfall') typingInput.focus();
});


// ----------------------------------------------------
// Word Fall Game Logic
// ----------------------------------------------------
let fallActive = false;
let fallScore = 0;
let fallLives = 3;
let fallingWordsList = [];
let fallLoop = null;
let spawnInterval = null;
let spawnRate = 2000;
let fallSpeed = 1;

function initWordfall() {
    fallActive = false;
    fallScore = 0;
    fallLives = 3;
    fallingWordsList = [];
    fallSpeed = 1;
    spawnRate = 2000;
    
    fallScoreDisplay.innerText = fallScore;
    fallLivesDisplay.innerText = fallLives;
    
    // Clear area except start overlay
    const elementsToRemove = wordfallArea.querySelectorAll('.falling-word');
    elementsToRemove.forEach(el => el.remove());
    
    wordfallStart.style.display = 'flex';
    wordfallInput.value = '';
    wordfallInput.blur();
    clearInterval(fallLoop);
    clearInterval(spawnInterval);
}

startWordfallBtn.addEventListener('click', () => {
    wordfallStart.style.display = 'none';
    fallActive = true;
    wordfallInput.focus();
    
    spawnWord();
    
    spawnInterval = setInterval(() => {
        if(fallActive) spawnWord();
    }, spawnRate);
    
    fallLoop = setInterval(updateWordfall, 50);
});

function spawnWord() {
    const wordText = getRandomWords(1)[0];
    const wordEl = document.createElement('div');
    wordEl.classList.add('falling-word');
    wordEl.innerHTML = `<span>${wordText}</span>`;
    
    // Random horizontal position (padding 20px)
    const maxLeft = wordfallArea.clientWidth - 100; // Approx word width
    const leftPos = Math.max(20, Math.floor(Math.random() * maxLeft));
    
    wordEl.style.left = `${leftPos}px`;
    wordEl.style.top = `-30px`;
    
    wordfallArea.appendChild(wordEl);
    
    fallingWordsList.push({
        text: wordText,
        typed: "",
        element: wordEl,
        top: -30
    });
    
    // Increase difficulty
    spawnRate = Math.max(500, spawnRate - 50);
    fallSpeed += 0.05;
    
    clearInterval(spawnInterval);
    spawnInterval = setInterval(() => {
        if(fallActive) spawnWord();
    }, spawnRate);
}

function updateWordfall() {
    if(!fallActive) return;
    
    const bottomLimit = wordfallArea.clientHeight;
    
    for (let i = fallingWordsList.length - 1; i >= 0; i--) {
        const wordObj = fallingWordsList[i];
        wordObj.top += fallSpeed;
        wordObj.element.style.top = `${wordObj.top}px`;
        
        // Hit bottom
        if (wordObj.top > bottomLimit) {
            wordObj.element.remove();
            fallingWordsList.splice(i, 1);
            loseLife();
        }
    }
}

function loseLife() {
    fallLives--;
    fallLivesDisplay.innerText = fallLives;
    playErrorSound();
    
    wordfallArea.classList.add('shake');
    setTimeout(() => wordfallArea.classList.remove('shake'), 200);
    
    if (fallLives <= 0) {
        endWordfall();
    }
}

function endWordfall() {
    fallActive = false;
    clearInterval(fallLoop);
    clearInterval(spawnInterval);
    wordfallInput.blur();
    
    resultWpm.innerText = fallScore;
    resultWpm.nextElementSibling.innerText = "SCORE";
    resultAcc.innerText = "0";
    resultAcc.nextElementSibling.innerText = "LIVES";
    
    resultCorrect.parentNode.style.display = 'none';
    resultIncorrect.parentNode.style.display = 'none';
    
    modal.classList.add('show');
}

wordfallArea.addEventListener('click', () => {
    if (currentMode === 'wordfall' && fallActive) {
        wordfallInput.focus();
    }
});

wordfallInput.addEventListener('input', (e) => {
    if (!fallActive) return;
    
    const typed = wordfallInput.value.toLowerCase().trim();
    const lastChar = e.inputType === 'deleteContentBackward' ? '' : wordfallInput.value.slice(-1);
    
    if (lastChar === ' ') {
        wordfallInput.value = '';
        return;
    }
    
    let matched = false;
    let anyPrefixMatch = false;
    
    // Check all falling words
    for (let i = 0; i < fallingWordsList.length; i++) {
        const wordObj = fallingWordsList[i];
        
        if (wordObj.text === typed) {
            // Full match
            playClickSound();
            wordObj.element.remove();
            fallingWordsList.splice(i, 1);
            
            fallScore += wordObj.text.length * 10;
            fallScoreDisplay.innerText = fallScore;
            
            wordfallInput.value = '';
            matched = true;
            break;
        } else if (wordObj.text.startsWith(typed)) {
            anyPrefixMatch = true;
            // Update highlight
            wordObj.element.innerHTML = `<span class="typed">${typed}</span><span>${wordObj.text.slice(typed.length)}</span>`;
        } else {
            // Reset highlight
            wordObj.element.innerHTML = `<span>${wordObj.text}</span>`;
        }
    }
    
    if (typed.length > 0 && !matched) {
        if (anyPrefixMatch) {
            playClickSound();
        } else {
            // No word starts with this typed sequence
            playErrorSound();
            wordfallInput.value = typed.slice(0, -1); // prevent typing wrong letters
            
            // visually show error
            fallingWordsList.forEach(w => {
               if(w.text.startsWith(wordfallInput.value)) {
                   w.element.innerHTML = `<span class="typed">${wordfallInput.value}</span><span class="error-typed">${typed.slice(-1)}</span><span>${w.text.slice(wordfallInput.value.length+1)}</span>`;
               }
            });
        }
    }
});

// Initialize first view
initTest();

// ----------------------------------------------------
// Learn Mode Logic
// ----------------------------------------------------
const lessonSelect = document.getElementById('lesson-select');
const learnWordsContainer = document.getElementById('learn-words');
const learnInput = document.getElementById('learn-input');
const learnAccuracy = document.getElementById('learn-accuracy');
const learnProgress = document.getElementById('learn-progress');
const keyboardKeys = document.querySelectorAll('.key');

const LESSONS = [
    { name: 'Home Row', text: 'asdf jkl; asdf jkl; fdsa ;lkj asdf jkl;' },
    { name: 'Top Row', text: 'qwer uiop qwer uiop rewq poiu qwer uiop' },
    { name: 'Bottom Row', text: 'zxcv m,./ zxcv m,./ vcxz /.,m zxcv m,./' },
    { name: 'Numbers', text: '1234 7890 1234 7890 4321 0987 1234 7890' }
];

let learnCurrentIndex = 0;
let learnErrors = 0;
let learnText = '';

function initLearn() {
    learnCurrentIndex = 0;
    learnErrors = 0;
    
    const lessonIdx = parseInt(lessonSelect.value) || 0;
    learnText = LESSONS[lessonIdx].text;
    
    learnAccuracy.innerText = '100%';
    learnProgress.innerText = '0%';
    
    renderLearnText();
    highlightNextKey();
    
    learnInput.value = '';
    learnInput.focus();
}

function renderLearnText() {
    learnWordsContainer.innerHTML = '';
    learnText.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('letter');
        if (i === 0) span.classList.add('active-letter');
        learnWordsContainer.appendChild(span);
    });
}

function highlightNextKey() {
    keyboardKeys.forEach(k => k.classList.remove('highlight'));
    if (learnCurrentIndex < learnText.length) {
        const nextChar = learnText[learnCurrentIndex];
        const keyEl = Array.from(keyboardKeys).find(k => k.dataset.key === nextChar.toLowerCase());
        if (keyEl) keyEl.classList.add('highlight');
    }
}

if(lessonSelect) lessonSelect.addEventListener('change', initLearn);

const learnView = document.getElementById('learn-view');
if(learnView) {
    learnView.addEventListener('click', () => {
        if(learnInput) learnInput.focus();
    });
}

if(learnInput) {
    learnInput.addEventListener('input', (e) => {
        if (currentMode !== 'learn') return;
        
        const typed = learnInput.value;
        const lastChar = typed.slice(-1);
        const isBackspace = e.inputType === 'deleteContentBackward';
        
        const letterEls = learnWordsContainer.children;
        
        if (isBackspace) {
            playClickSound();
            if (learnCurrentIndex > 0) {
                learnCurrentIndex--;
                letterEls[learnCurrentIndex].classList.remove('correct', 'incorrect');
                updateLearnActiveLetter(letterEls, learnCurrentIndex);
                highlightNextKey();
            }
            return;
        }
        
        if (learnCurrentIndex < learnText.length) {
            const expected = learnText[learnCurrentIndex];
            
            // Visual key press on virtual keyboard
            const keyEl = Array.from(keyboardKeys).find(k => k.dataset.key === lastChar.toLowerCase());
            if (keyEl) {
                keyEl.classList.add('active-press');
                setTimeout(() => keyEl.classList.remove('active-press'), 100);
            }
            
            if (lastChar === expected) {
                letterEls[learnCurrentIndex].classList.add('correct');
                playClickSound();
            } else {
                letterEls[learnCurrentIndex].classList.add('incorrect');
                learnErrors++;
                playErrorSound();
            }
            
            learnCurrentIndex++;
            updateLearnActiveLetter(letterEls, learnCurrentIndex);
            highlightNextKey();
            
            // Update stats
            const progress = Math.round((learnCurrentIndex / learnText.length) * 100);
            learnProgress.innerText = progress + '%';
            
            const accuracy = learnCurrentIndex === 0 ? 100 : Math.round(((learnCurrentIndex - learnErrors) / learnCurrentIndex) * 100);
            learnAccuracy.innerText = Math.max(0, accuracy) + '%';
            
            if (learnCurrentIndex >= learnText.length) {
                // Lesson Complete
                setTimeout(() => {
                    alert('Lesson Complete! Accuracy: ' + Math.max(0, accuracy) + '%');
                    initLearn();
                }, 100);
            }
        }
    });
}

function updateLearnActiveLetter(els, idx) {
    Array.from(els).forEach(l => l.classList.remove('active-letter'));
    if (idx < els.length) {
        els[idx].classList.add('active-letter');
    }
}
