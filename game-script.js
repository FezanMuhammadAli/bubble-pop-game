class EnhancedBubblePopGame {
    constructor() {
        this.gameContainer = document.getElementById('gameContainer');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.multiplierElement = document.getElementById('multiplier');
        this.powerUpBar = document.getElementById('powerUpBar');
        
        // Game state
        this.score = 0;
        this.lives = 5;
        this.level = 1;
        this.bubbles = [];
        this.gameRunning = false;
        this.gamePaused = false;
        this.bubbleSpeed = 1;
        this.spawnRate = 2000;
        this.combo = 0;
        this.bestCombo = 0;
        this.comboTimer = null;
        this.multiplier = 1;
        this.bubblesPopped = 0;
        this.bubblesClicked = 0;
        this.difficulty = 'normal';
        
        // High score
        this.highScore = localStorage.getItem('bubblePopHighScore') || 0;
        document.getElementById('displayHighScore').textContent = this.highScore;
        
        // Power-ups
        this.powerUps = {
            slowMotion: { active: false, duration: 0 },
            doublePoints: { active: false, duration: 0 }
        };
        
        // Sound
        this.soundEnabled = true;
        this.sounds = {
            pop: document.getElementById('popSound'),
            combo: document.getElementById('comboSound'),
            powerUp: document.getElementById('powerUpSound')
        };
        
        // Bubble types
        this.bubbleTypes = {
            normal: { color: '#FF6B6B', points: 10, speed: 1, icon: '' },
            fast: { color: '#FFEAA7', points: 20, speed: 1.5, icon: '⚡' },
            slow: { color: '#74B9FF', points: 15, speed: 0.5, icon: '🐌' },
            bomb: { color: '#2D3436', points: -20, speed: 0.8, icon: '💣' },
            golden: { color: '#FFD700', points: 50, speed: 0.7, icon: '⭐' },
            rainbow: { color: 'rainbow', points: 30, speed: 1, icon: '🌈' }
        };
        
        this.spawnInterval = null;
        this.gameLoop = null;
        this.powerUpLoop = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameRunning && !this.gamePaused) {
                    this.pauseGame();
                } else if (this.gamePaused) {
                    this.resumeGame();
                }
            }
        });
    }

    startGame() {
        this.difficulty = document.getElementById('difficultySelect').value;
        this.startScreen.style.display = 'none';
        this.gameRunning = true;
        this.gamePaused = false;
        
        // Reset game state
        this.score = 0;
        this.lives = this.getDifficultySettings().lives;
        this.level = 1;
        this.bubbleSpeed = this.getDifficultySettings().speed;
        this.spawnRate = this.getDifficultySettings().spawnRate;
        this.combo = 0;
        this.bestCombo = 0;
        this.multiplier = 1;
        this.bubblesPopped = 0;
        this.bubblesClicked = 0;
        
        this.powerUps.slowMotion = { active: false, duration: 0 };
        this.powerUps.doublePoints = { active: false, duration: 0 };
        
        this.updateUI();
        this.startSpawning();
        this.startGameLoop();
        this.startPowerUpLoop();
    }

    getDifficultySettings() {
        const settings = {
            easy: { lives: 7, speed: 0.8, spawnRate: 2500 },
            normal: { lives: 5, speed: 1, spawnRate: 2000 },
            hard: { lives: 3, speed: 1.3, spawnRate: 1500 }
        };
        return settings[this.difficulty];
    }

    pauseGame() {
        this.gamePaused = true;
        this.pauseScreen.style.display = 'block';
    }

    resumeGame() {
        this.gamePaused = false;
        this.pauseScreen.style.display = 'none';
    }

    startSpawning() {
        this.spawnInterval = setInterval(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.createBubble();
            }
        }, this.spawnRate);
    }

    startGameLoop() {
        this.gameLoop = setInterval(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.updateBubbles();
                this.checkLevelUp();
            }
        }, 16);
    }

    startPowerUpLoop() {
        this.powerUpLoop = setInterval(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.updatePowerUps();
            }
        }, 100);
    }

    createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Determine bubble type
        const typeRoll = Math.random();
        let bubbleType = 'normal';
        
        if (typeRoll < 0.05) bubbleType = 'bomb';
        else if (typeRoll < 0.1) bubbleType = 'golden';
        else if (typeRoll < 0.15) bubbleType = 'rainbow';
        else if (typeRoll < 0.3) bubbleType = 'fast';
        else if (typeRoll < 0.45) bubbleType = 'slow';
        
        const type = this.bubbleTypes[bubbleType];
        const size = Math.random() * 30 + 40; // 40-70px
        const x = Math.random() * (this.gameContainer.offsetWidth - size);
        
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = x + 'px';
        bubble.style.bottom = '-' + size + 'px';
        bubble.textContent = type.icon;
        
        // Set bubble appearance
        if (bubbleType === 'rainbow') {
            bubble.classList.add('rainbow');
        } else if (bubbleType === 'bomb') {
            bubble.classList.add('bomb');
        } else if (bubbleType === 'golden') {
            bubble.classList.add('golden');
        } else {
            bubble.style.background = `radial-gradient(circle at 30% 30%, ${type.color}, ${this.darkenColor(type.color, 20)})`;
        }
        
        bubble.addEventListener('click', () => this.popBubble(bubble, bubbleType));
        
        this.gameContainer.appendChild(bubble);
        this.bubbles.push({
            element: bubble,
            y: -size,
            size: size,
            type: bubbleType,
            speed: type.speed
        });
    }

    popBubble(bubbleElement, bubbleType) {
        const bubbleIndex = this.bubbles.findIndex(b => b.element === bubbleElement);
        if (bubbleIndex === -1) return;
        
        const bubble = this.bubbles[bubbleIndex];
        const type = this.bubbleTypes[bubbleType];
        
        this.bubblesClicked++;
        
        // Handle special bubble effects
        if (bubbleType === 'bomb') {
            this.lives--;
            this.createExplosion(bubbleElement);
            this.playSound('pop');
        } else if (bubbleType === 'golden') {
            this.lives++;
            this.activatePowerUp('doublePoints', 5000);
            this.playSound('powerUp');
        } else if (bubbleType === 'rainbow') {
            this.popNearbyBubbles(bubble);
            this.activatePowerUp('slowMotion', 3000);
            this.playSound('powerUp');
        } else if (bubbleType === 'slow') {
            this.activatePowerUp('slowMotion', 2000);
            this.playSound('pop');
        } else {
            this.playSound('pop');
        }
        
        if (bubbleType !== 'bomb') {
            this.bubblesPopped++;
            
            // Combo system
            this.combo++;
            if (this.combo > this.bestCombo) {
                this.bestCombo = this.combo;
            }
            
            clearTimeout(this.comboTimer);
            this.comboTimer = setTimeout(() => {
                this.combo = 0;
                this.multiplier = 1;
                this.multiplierElement.style.display = 'none';
            }, 1500);
            
            // Calculate points
            let points = type.points;
            if (this.combo > 1) {
                this.multiplier = Math.min(this.combo, 5);
                points *= this.multiplier;
                this.multiplierElement.style.display = 'block';
                this.showCombo(bubble.element, this.combo);
                this.playSound('combo');
            }
            
            if (this.powerUps.doublePoints.active) {
                points *= 2;
            }
            
            this.score += points;
            this.showScorePopup(bubble.element, points);
        }
        
        this.updateUI();
        
        // Pop animation
        bubbleElement.classList.add('popping');
        setTimeout(() => {
            if (bubbleElement.parentNode) {
                bubbleElement.parentNode.removeChild(bubbleElement);
            }
        }, 300);
        
        this.bubbles.splice(bubbleIndex, 1);
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    popNearbyBubbles(centerBubble) {
        const radius = 100;
        const centerX = parseInt(centerBubble.element.style.left) + centerBubble.size / 2;
        const centerY = parseInt(centerBubble.element.style.bottom) + centerBubble.size / 2;
        
        this.bubbles.forEach(bubble => {
            if (bubble === centerBubble) return;
            
            const bubbleX = parseInt(bubble.element.style.left) + bubble.size / 2;
            const bubbleY = parseInt(bubble.element.style.bottom) + bubble.size / 2;
            const distance = Math.sqrt(Math.pow(centerX - bubbleX, 2) + Math.pow(centerY - bubbleY, 2));
            
            if (distance <= radius) {
                setTimeout(() => {
                    if (bubble.element.parentNode) {
                        this.popBubble(bubble.element, bubble.type);
                    }
                }, Math.random() * 200);
            }
        });
    }

    createExplosion(bubbleElement) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.textContent = '💥';
        explosion.style.left = bubbleElement.style.left;
        explosion.style.bottom = bubbleElement.style.bottom;
        explosion.style.fontSize = '3em';
        explosion.style.color = '#ff4757';
        
        this.gameContainer.appendChild(explosion);
        
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.parentNode.removeChild(explosion);
            }
        }, 600);
    }

    activatePowerUp(type, duration) {
        this.powerUps[type].active = true;
        this.powerUps[type].duration = duration;
        this.powerUpBar.style.display = 'block';
        
        if (type === 'slowMotion') {
            this.gameContainer.classList.add('slow-motion');
        }
    }

    updatePowerUps() {
        Object.keys(this.powerUps).forEach(type => {
            if (this.powerUps[type].active) {
                this.powerUps[type].duration -= 100;
                
                const timerElement = document.getElementById(type + 'Timer');
                const percentage = (this.powerUps[type].duration / (type === 'slowMotion' ? 3000 : 5000)) * 100;
                timerElement.style.width = percentage + '%';
                
                if (this.powerUps[type].duration <= 0) {
                    this.powerUps[type].active = false;
                    if (type === 'slowMotion') {
                        this.gameContainer.classList.remove('slow-motion');
                    }
                }
            }
        });
        
        const anyActive = Object.values(this.powerUps).some(p => p.active);
        if (!anyActive) {
            this.powerUpBar.style.display = 'none';
        }
    }

    updateBubbles() {
        const speedMultiplier = this.powerUps.slowMotion.active ? 0.3 : 1;
        
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            const moveSpeed = this.bubbleSpeed * bubble.speed * speedMultiplier;
            bubble.y += moveSpeed;
            bubble.element.style.bottom = bubble.y + 'px';
            
            if (bubble.y > this.gameContainer.offsetHeight + bubble.size) {
                if (bubble.type !== 'bomb') {
                    this.lives--;
                }
                
                bubble.element.parentNode.removeChild(bubble.element);
                this.bubbles.splice(i, 1);
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        }
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 150) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.bubbleSpeed += 0.3;
            this.spawnRate = Math.max(800, this.spawnRate - 150);
            
            clearInterval(this.spawnInterval);
            this.startSpawning();
            
            this.updateUI();
        }
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.levelElement.textContent = this.level;
        document.getElementById('multiplierValue').textContent = this.multiplier + 'x';
    }

    showCombo(bubbleElement, comboCount) {
        const comboText = document.createElement('div');
        comboText.className = 'combo';
        comboText.textContent = `${comboCount}x COMBO!`;
        comboText.style.left = bubbleElement.style.left;
        comboText.style.bottom = bubbleElement.style.bottom;
        
        this.gameContainer.appendChild(comboText);
        
        setTimeout(() => {
            if (comboText.parentNode) {
                comboText.parentNode.removeChild(comboText);
            }
        }, 1000);
    }

    showScorePopup(bubbleElement, points) {
        const scoreText = document.createElement('div');
        scoreText.className = 'score-popup';
        scoreText.textContent = '+' + points;
        scoreText.style.left = bubbleElement.style.left;
        scoreText.style.bottom = bubbleElement.style.bottom;
        
        this.gameContainer.appendChild(scoreText);
        
        setTimeout(() => {
            if (scoreText.parentNode) {
                scoreText.parentNode.removeChild(scoreText);
            }
        }, 1000);
    }

    playSound(soundName) {
        if (this.soundEnabled && this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(() => {});
        }
    }

    gameOver() {
        this.gameRunning = false;
        clearInterval(this.spawnInterval);
        clearInterval(this.gameLoop);
        clearInterval(this.powerUpLoop);
        
        // Check for high score
        const isNewHighScore = this.score > this.highScore;
        if (isNewHighScore) {
            this.highScore = this.score;
            localStorage.setItem('bubblePopHighScore', this.highScore);
            document.getElementById('newHighScore').style.display = 'block';
        }
        
        // Update final stats
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('bubblesPopped').textContent = this.bubblesPopped;
        document.getElementById('bestCombo').textContent = this.bestCombo;
        
        const accuracy = this.bubblesClicked > 0 ? Math.round((this.bubblesPopped / this.bubblesClicked) * 100) : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
        
        this.gameOverScreen.style.display = 'block';
        
        // Clear remaining bubbles
        this.bubbles.forEach(bubble => {
            if (bubble.element.parentNode) {
                bubble.element.parentNode.removeChild(bubble.element);
            }
        });
        this.bubbles = [];
    }

    restart() {
        this.gameOverScreen.style.display = 'none';
        document.getElementById('newHighScore').style.display = 'none';
        this.gameContainer.classList.remove('slow-motion');
        this.startGame();
    }

    toggleMute() {
        this.soundEnabled = !this.soundEnabled;
        document.getElementById('muteBtn').textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
}

// Initialize game
const game = new EnhancedBubblePopGame();

function startGame() {
    game.startGame();
}

function restartGame() {
    game.restart();
}

function resumeGame() {
    game.resumeGame();
}

function toggleMute() {
    game.toggleMute();
}

// Prevent context menu
document.addEventListener('contextmenu', e => e.preventDefault());
