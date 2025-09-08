// User model structure
class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.avatar = data.avatar || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.isOnline = data.isOnline || false;
        this.gamesPlayed = data.gamesPlayed || 0;
        this.gamesWon = data.gamesWon || 0;
    }

    // Convert to JSON (remove sensitive data)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            avatar: this.avatar,
            isOnline: this.isOnline,
            gamesPlayed: this.gamesPlayed,
            gamesWon: this.gamesWon,
            winRate: this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(2) : 0,
            createdAt: this.createdAt
        };
    }

    // Calculate win rate
    getWinRate() {
        return this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(2) : 0;
    }

    // Update stats
    updateStats(won = false) {
        this.gamesPlayed += 1;
        if (won) {
            this.gamesWon += 1;
        }
        this.updatedAt = new Date();
    }
}

module.exports = User;
