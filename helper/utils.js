// Date formatting utilities
const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD HH:mm:ss':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        default:
            return d.toISOString();
    }
};

const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

// ID generation utilities
const generateId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const generateGameId = () => {
    return `game_${generateId(10)}`;
};

const generateRoomId = () => {
    return `room_${generateId(6).toUpperCase()}`;
};

module.exports = {
    formatDate,
    getCurrentTimestamp,
    generateId,
    generateGameId,
    generateRoomId
};
