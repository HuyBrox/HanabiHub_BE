const config = {
    development: {
        port: process.env.PORT || 3000,
        nodeEnv: 'development',
        // Add other development configurations here
    },
    production: {
        port: process.env.PORT || 8080,
        nodeEnv: 'production',
        // Add other production configurations here
    },
    test: {
        port: process.env.PORT || 3001,
        nodeEnv: 'test',
        // Add other test configurations here
    }
};

const env = process.env.NODE_ENV || 'development';

module.exports = config[env];
