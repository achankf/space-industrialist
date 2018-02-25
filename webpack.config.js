const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    devtool: "inline-source-map", // hosted on Github anyway
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
    plugins: [
        new UglifyJsPlugin({
            sourceMap: true,
        })
    ],
};