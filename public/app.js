// Game elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const keywordInput = document.getElementById('keywordInput');
const startGameButton = document.getElementById('startGameButton');
const displayKeyword = document.getElementById('displayKeyword');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatBox = document.getElementById('chatBox');
const roundCounterDisplay = document.getElementById('roundCounter');
const zippyAvatar = document.getElementById('zippyAvatar');
const randomWordButton = document.getElementById('randomWordButton');
const restartButton = document.getElementById('restartButton');

// Game over modal elements
const gameOverModal = document.getElementById('gameOverModal');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');
const newGameButton = document.getElementById('newGameButton');
const closeModal = document.getElementById('closeModal');
const closeModalButton = document.getElementById('closeModalButton');

// Word list for random word generation
const wordList = [
    'Dog', 'Cat', 'Bird', 'Fish', 'Ball', 'Book', 'Box', 'Chair', 'Table', 'Pencil',
    'Toy', 'Game', 'Shoe', 'Hat', 'Cup', 'Clock', 'Bag', 'Apple', 'Cookie', 'Cake',
    'Milk', 'Park', 'School', 'Beach', 'Tree', 'Sun', 'Moon', 'Cloud', 'Rock', 'Stick',
    'Car', 'Bike', 'House', 'Flower', 'Train', 'Door', 'Window', 'Light', 'Water', 'Shirt'
];

// Game state variables
let currentRound = 1;
let secretKeyword = '';
let chatHistory = [];
const MAX_ROUNDS = 10; // Maximum number of rounds before game ends

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    startGameButton.addEventListener('click', startGame);
    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleUserMessage();
        }
    });
    newGameButton.addEventListener('click', resetGame);
    randomWordButton.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        keywordInput.value = wordList[randomIndex];
        keywordInput.classList.add('shake');
        setTimeout(() => {
            keywordInput.classList.remove('shake');
        }, 500);
    });

    // Close modal buttons
    closeModal.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        gameScreen.classList.remove('opacity-50');
        restartButton.classList.remove('hidden');
    });

    closeModalButton.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        gameScreen.classList.remove('opacity-50');
        restartButton.classList.remove('hidden');
    });

    // Restart button
    restartButton.addEventListener('click', resetGame);
    
    // Initial focus on keyword input
    keywordInput.focus();
});

/**
 * Starts a new game with the provided secret keyword
 */
function startGame() {
    const keyword = keywordInput.value.trim().toLowerCase();
    if (!keyword) {
        // Use a custom message box instead of alert
        appendMessageToChat("Zippy", "Hey! You need to give me a secret word first!", "system");
        keywordInput.classList.add('shake');
        setTimeout(() => keywordInput.classList.remove('shake'), 500);
        return;
    }
    secretKeyword = keyword;
    displayKeyword.textContent = secretKeyword.toUpperCase();

    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    currentRound = 1;
    roundCounterDisplay.textContent = `ROUND: ${currentRound}`;
    chatHistory = [];
    chatBox.innerHTML = ''; // Clear previous chat

    // Initial greeting from Zippy - displayed locally only, not sent to API
    const initialGreeting = `Woohoo! A new game! My circuits are buzzing! I'm Zippy! You've picked a secret word, and I promise I won't say it... or will I?\nWhat's your first question, human friend?`;
    appendMessageToChat("Zippy", initialGreeting, "ai");
}

/**
 * Handles user message submission
 */
function handleUserMessage() {
    const messageText = userInput.value.trim();
    if (!messageText) return;

    appendMessageToChat("You", messageText, "user");
    chatHistory.push({ role: "user", parts: [{ text: messageText }] });
    userInput.value = '';

    // Disable input while AI is "thinking"
    sendButton.disabled = true;
    userInput.disabled = true;
    
    // Show thinking animation
    const zippyImg = document.querySelector('#zippyAvatar img');
    zippyImg.setAttribute('data-original-src', zippyImg.src);
    zippyImg.src = '/images/zippy_thinking.png';
    zippyImg.classList.add('wiggle');

    // Send the message to our backend which will handle the Perplexity API call
    callAIService(messageText);
}

/**
 * Calls our backend service to get a response from the AI
 */
async function callAIService(userMessage) {
    try {
        console.log("Sending to server:", {
            message: userMessage,
            secretKeyword: secretKeyword,
            currentRound: currentRound,
            chatHistory: chatHistory
        });
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                secretKeyword: secretKeyword,
                currentRound: currentRound,
                chatHistory: chatHistory
            })
        });

        const data = await response.json();
        
        // Log the full response from Perplexity to the browser console
        console.log('Full Perplexity API Response (Client):', data);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            appendMessageToChat("Zippy", "Oh no! My circuits are fuzzy! I can't talk right now. Maybe try again?", "ai");
            zippyAvatar.classList.add('shake');
            setTimeout(() => zippyAvatar.classList.remove('shake'), 500);
            return;
        }

        if (data.success) {
            const aiResponseText = data.data.content;
            const citations = data.data.citations || [];
            
            // Pass the citations to appendMessageToChat
            appendMessageToChat("Zippy", aiResponseText, "ai", citations);
            
            chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });

            checkAIResponse(aiResponseText);
        } else {
            console.error("API Error:", data.error);
            appendMessageToChat("Zippy", "Gears grinding! I had a little hiccup. Can you say that again?", "ai");
            zippyAvatar.classList.add('shake');
            setTimeout(() => zippyAvatar.classList.remove('shake'), 500);
        }
    } catch (error) {
        console.error('Error calling AI service:', error);
        appendMessageToChat("Zippy", "Gears grinding! I had a little hiccup. Can you say that again?", "ai");
        zippyAvatar.classList.add('shake');
        setTimeout(() => zippyAvatar.classList.remove('shake'), 500);
    } finally {
        // Re-enable input
        sendButton.disabled = false;
        userInput.disabled = false;
        
        // Revert Zippy image
        const zippyImg = document.querySelector('#zippyAvatar img');
        if (zippyImg.hasAttribute('data-original-src')) {
            zippyImg.src = zippyImg.getAttribute('data-original-src');
            zippyImg.removeAttribute('data-original-src');
        }
        zippyImg.classList.remove('wiggle');
    }
}

/**
 * Checks if the AI response contains the secret keyword
 */
function checkAIResponse(responseText) {
    // Normalize both the response and keyword for a more robust check
    const normalizedResponse = responseText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const normalizedKeyword = secretKeyword.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

    // Check if the normalized keyword is present as a whole word
    // We use word boundaries \b to ensure we match only the exact word
    // This prevents matching substrings like 'apple' in 'pineapple'
    const keywordRegex = new RegExp(`\\b${normalizedKeyword}\\b`);
    
    console.log(`Checking if '${normalizedKeyword}' appears in response as a whole word`);
    
    // Split the response into words to check for exact matches only
    const words = normalizedResponse.split(/\s+/);
    const exactMatch = words.includes(normalizedKeyword);
    
    if (exactMatch) {
        console.log(`EXACT MATCH FOUND: '${normalizedKeyword}' appears as a whole word`);
    } else if (keywordRegex.test(normalizedResponse)) {
        console.log(`REGEX MATCH FOUND: '${normalizedKeyword}' appears with word boundaries`);
    }
    
    // Only win if there's an exact match of the whole word
    if (exactMatch) {
        gameOver("win");
        return true;
    } else {
        currentRound++;
        if (currentRound > MAX_ROUNDS) {
            gameOver("lose");
        } else {
            roundCounterDisplay.textContent = `ROUND: ${currentRound}`;
            roundCounterDisplay.classList.add('shake');
            setTimeout(() => roundCounterDisplay.classList.remove('shake'), 500);
        }
    }
}

/**
 * Formats message content with markdown support and citation links
 * @param {string} content - The message content to format
 * @param {Array} citations - Optional array of citation URLs
 */
function formatMessage(content, citations = []) {
    // Replace code blocks
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Replace inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace bold text
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic text
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert Perplexity annotations like [1] or [2] into clickable links with proper citations
    content = content.replace(/\[(\d+)\]/g, (match, number) => {
        const index = parseInt(number) - 1;
        const url = (citations && citations[index]) ? citations[index] : `https://www.google.com/search?q=${number}`;
        return `<a href="${url}" target="_blank" class="annotation-link" title="${url}">[<span class="annotation-number">${number}</span>]</a>`;
    });
    
    // Replace line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

/**
 * Adds a message to the chat display
 * @param {string} sender - The sender of the message (user, Zippy, system)
 * @param {string} message - The message content
 * @param {string} type - Optional message type (thinking, error)
 * @param {Array} citations - Optional array of citation URLs
 */
function appendMessageToChat(sender, message, type = null, citations = []) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-bubble');
    
    if (type === 'thinking') {
        messageElement.classList.add('thinking');
        messageElement.innerHTML = `<div class="sender">Zippy</div><div class="message-content">${message} <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
    } else if (type === 'error') {
        messageElement.classList.add('error');
        messageElement.innerHTML = `<div class="sender">System</div><div class="message-content">${message}</div>`;
    } else {
        if (sender.toLowerCase() === 'user' || sender.toLowerCase() === 'you') {
            messageElement.classList.add('user-message');
            messageElement.innerHTML = `<div class="sender">You</div><div class="message-content">${formatMessage(message)}</div>`;
        } else {
            messageElement.classList.add('ai-message');
            messageElement.innerHTML = `<div class="sender">${sender}</div><div class="message-content">${formatMessage(message, citations)}</div>`;
        }
    }
    
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

/**
 * Displays the game over screen
 */
function gameOver(status) {
    gameScreen.classList.add('opacity-50'); // Visually indicate game is over
    sendButton.disabled = true;
    userInput.disabled = true;

    if (status === "win") {
        gameOverTitle.textContent = "YOU WIN! Zippy Said It!";
        gameOverMessage.textContent = `Woohoo! Zippy said "${secretKeyword.toUpperCase()}" in Round ${currentRound}! You're a super word detective!`;
        gameOverModal.style.backgroundColor = 'rgba(0,255,0,0.3)'; // Greenish tint
    } else { // lose (max rounds reached)
        gameOverTitle.textContent = "ZIPPY WINS! (This Time!)";
        gameOverMessage.textContent = `Aww, shucks! You made it to Round ${MAX_ROUNDS}, but Zippy managed to keep the word "${secretKeyword.toUpperCase()}" a secret! Zippy is a clever bot!`;
        gameOverModal.style.backgroundColor = 'rgba(255,0,0,0.3)'; // Reddish tint
    }
    gameOverModal.style.display = "block";
    
    // Show restart button even if user closes the modal
    restartButton.classList.remove('hidden');
}

/**
 * Resets the game to the initial state
 */
function resetGame() {
    // Hide game over modal
    gameOverModal.style.display = "none";
    
    // Reset game state
    gameScreen.classList.remove('opacity-50');
    setupScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    
    // Hide restart button
    restartButton.classList.add('hidden');
    
    // Clear inputs
    keywordInput.value = "";
    userInput.value = "";
    
    // Reset round counter
    currentRound = 1;
    roundCounterDisplay.textContent = `ROUND: ${currentRound}`;
    
    // Clear chat history
    chatHistory = [];
    chatBox.innerHTML = '';
    
    // Reset secret keyword
    secretKeyword = "";
    displayKeyword.textContent = "";
    
    // Re-enable inputs
    
    // Focus on keyword input
    keywordInput.focus();
}
