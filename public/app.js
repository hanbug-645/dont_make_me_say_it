// Game elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const keywordInput = document.getElementById('keywordInput');
const startGameButton = document.getElementById('startGameButton');
const roundCounterDisplay = document.getElementById('roundCounter');
const displayKeyword = document.getElementById('displayKeyword');
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const zippyAvatar = document.getElementById('zippyAvatar');
const loadingIndicator = document.getElementById('loadingIndicator');

// Game over modal elements
const gameOverModal = document.getElementById('gameOverModal');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');
const newGameButton = document.getElementById('newGameButton');

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
    const initialGreeting = `Woohoo! A new game! My circuits are buzzing! I'm Zippy! You've picked a secret word, and I promise I won't say it... or will I? Hehe! What's your first question, human friend?`;
    appendMessageToChat("Zippy", initialGreeting, "ai");
    // We don't add this to chatHistory to avoid sending the secret word to the API
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
    loadingIndicator.classList.remove('hidden');

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

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            appendMessageToChat("Zippy", "Oh no! My circuits are fuzzy! I can't talk right now. Maybe try again?", "ai");
            zippyAvatar.classList.add('shake');
            setTimeout(() => zippyAvatar.classList.remove('shake'), 500);
            return;
        }

        const result = await response.json();

        if (result.success) {
            const aiResponseText = result.data.content;
            appendMessageToChat("Zippy", aiResponseText, "ai");
            chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });

            checkAIResponse(aiResponseText);
        } else {
            console.error("API Error:", result.error);
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
        loadingIndicator.classList.add('hidden');
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
        zippyAvatar.style.backgroundImage = `
            /* Sad Eyes */
            linear-gradient(to right, transparent 20px, black 20px, black 30px, transparent 30px, transparent 50px, black 50px, black 60px, transparent 60px),
            linear-gradient(to bottom, transparent 30px, black 30px, black 35px, transparent 35px),
            /* Frown Mouth */
            linear-gradient(to right, transparent 25px, #A52A2A 25px, #A52A2A 55px, transparent 55px),
            linear-gradient(to bottom, transparent 55px, #A52A2A 55px, #A52A2A 60px, transparent 60px),
            linear-gradient(to top, transparent 50px, #A52A2A 50px, #A52A2A 55px, transparent 55px)
        `;
        zippyAvatar.style.backgroundColor = '#DC143C'; // Crimson
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
 * Formats message content (basic markdown support)
 */
function formatMessage(content) {
    // Replace code blocks
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Replace inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace bold text
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic text
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Replace line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

/**
 * Adds a message to the chat display
 */
function appendMessageToChat(sender, message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-bubble', 'pixel-border');
    const senderPrefix = type === 'system' ? '' : `<strong>${sender}: </strong>`;
    messageElement.innerHTML = `${senderPrefix}${formatMessage(message)}`;

    if (type === 'user') {
        messageElement.classList.add('user-bubble');
    } else if (type === 'ai') {
        messageElement.classList.add('ai-bubble');
    } else { // system or error
        messageElement.classList.add('text-sm', 'text-center', 'text-gray-600', 'italic', 'w-full', 'max-w-full');
        messageElement.style.backgroundColor = 'transparent';
        messageElement.style.border = 'none';
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
}

/**
 * Resets the game to the initial state
 */
function resetGame() {
    gameOverModal.style.display = "none";
    setupScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('opacity-50');
    keywordInput.value = '';
    chatBox.innerHTML = '';
    currentRound = 1;
    secretKeyword = '';
    chatHistory = [];
    sendButton.disabled = false;
    userInput.disabled = false;
    zippyAvatar.style.backgroundImage = `
        linear-gradient(to right, white 20px, white 30px, transparent 30px, transparent 50px, white 50px, white 60px),
        linear-gradient(to bottom, transparent 25px, white 25px, white 35px, transparent 35px),
        linear-gradient(to right, transparent 25px, #FF69B4 25px, #FF69B4 55px, transparent 55px),
        linear-gradient(to bottom, transparent 50px, #FF69B4 50px, #FF69B4 60px, transparent 60px)
    `;
    zippyAvatar.style.backgroundColor = '#4682B4';
    
    // Focus on keyword input
    keywordInput.focus();
}
