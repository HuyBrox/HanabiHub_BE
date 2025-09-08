// Game model structure for Hanabi
class Game {
    constructor(data) {
        this.id = data.id;
        this.roomId = data.roomId;
        this.players = data.players || [];
        this.status = data.status || 'waiting'; // waiting, playing, finished
        this.maxPlayers = data.maxPlayers || 4;
        this.currentPlayer = data.currentPlayer || 0;
        this.deck = data.deck || [];
        this.discardPile = data.discardPile || [];
        this.fireworks = data.fireworks || this.initializeFireworks();
        this.hints = data.hints || 8;
        this.lives = data.lives || 3;
        this.score = data.score || 0;
        this.gameLog = data.gameLog || [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.finishedAt = data.finishedAt || null;
    }

    // Initialize fireworks (5 colors)
    initializeFireworks() {
        return {
            red: 0,
            yellow: 0,
            green: 0,
            blue: 0,
            white: 0
        };
    }

    // Initialize standard Hanabi deck
    initializeDeck() {
        const colors = ['red', 'yellow', 'green', 'blue', 'white'];
        const deck = [];

        colors.forEach(color => {
            // 1s: 3 cards
            for (let i = 0; i < 3; i++) {
                deck.push({ color, number: 1, id: `${color}-1-${i}` });
            }
            // 2s, 3s, 4s: 2 cards each
            for (let number = 2; number <= 4; number++) {
                for (let i = 0; i < 2; i++) {
                    deck.push({ color, number, id: `${color}-${number}-${i}` });
                }
            }
            // 5s: 1 card
            deck.push({ color, number: 5, id: `${color}-5-0` });
        });

        return this.shuffleDeck(deck);
    }

    // Shuffle deck
    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Add player to game
    addPlayer(player) {
        if (this.players.length < this.maxPlayers && this.status === 'waiting') {
            this.players.push({
                id: player.id,
                username: player.username,
                hand: [],
                joinedAt: new Date()
            });
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Remove player from game
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Start game
    startGame() {
        if (this.players.length >= 2 && this.status === 'waiting') {
            this.deck = this.initializeDeck();
            this.dealCards();
            this.status = 'playing';
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Deal cards to players
    dealCards() {
        const cardsPerPlayer = this.players.length <= 3 ? 5 : 4;

        this.players.forEach(player => {
            player.hand = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        });
    }

    // Calculate current score
    calculateScore() {
        this.score = Object.values(this.fireworks).reduce((sum, level) => sum + level, 0);
        return this.score;
    }

    // Check if game is won
    isGameWon() {
        return this.calculateScore() === 25; // Perfect score
    }

    // Check if game is over
    isGameOver() {
        return this.lives === 0 || this.isGameWon() || this.deck.length === 0;
    }

    // End game
    endGame() {
        this.status = 'finished';
        this.finishedAt = new Date();
        this.updatedAt = new Date();
        this.calculateScore();
    }

    // Convert to JSON (hide sensitive data like other players' cards)
    toJSON(currentPlayerId = null) {
        const gameData = {
            id: this.id,
            roomId: this.roomId,
            status: this.status,
            maxPlayers: this.maxPlayers,
            currentPlayer: this.currentPlayer,
            discardPile: this.discardPile,
            fireworks: this.fireworks,
            hints: this.hints,
            lives: this.lives,
            score: this.calculateScore(),
            deckSize: this.deck.length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            finishedAt: this.finishedAt,
            players: this.players.map(player => ({
                id: player.id,
                username: player.username,
                handSize: player.hand.length,
                hand: player.id === currentPlayerId ? player.hand : null // Only show current player's cards
            }))
        };

        return gameData;
    }
}

module.exports = Game;
