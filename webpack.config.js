const path = require('path');

module.exports = {
    entry: './src/index.ts',
    devtool: "inline-source-map",
    module: {
        rules: [{
            test: /\.ts?$/,
            use: 'ts-loader',
        }],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    externals: {
        dexie: 'Dexie',
        immutable: 'Immutable',
    },
};