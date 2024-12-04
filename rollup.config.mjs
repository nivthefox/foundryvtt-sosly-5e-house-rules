import combine from 'rollup-plugin-combine';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import match from 'rollup-plugin-match';
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from '@rollup/plugin-terser';
import * as yaml from 'js-yaml';

// License banner
const banner = `/**
 * Copyright 2024 Kevin Kragenbrink, II
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/
`;

// Shared configuration
const sharedConfig = {
    treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
    },
    watch: {
        clearScreen: false,
        exclude: 'node_modules/**'
    }
};

// Shared plugins
const createCommonPlugins = (isProduction) => [
    json({
        preferConst: true,
        compact: false
    }),
    nodeResolve({
        browser: true,
        preferBuiltins: false
    }),
].filter(Boolean);

// Production flag
const isProduction = process.env.NODE_ENV === 'production';

// Main bundle configuration
const main = {
    ...sharedConfig,
    input: 'src/main.js',
    external: [
        '../../../../systems/dnd5e/dnd5e.mjs',
    ],
    output: {
        file: `dist/house-rules.js`,
        format: 'es',
        sourcemap: true,
        banner,
        compact: false,
        paths: {
            // Rewrite the path relative to output file
            '../../../../systems/dnd5e/dnd5e.mjs': '../../systems/dnd5e/dnd5e'
        }
    },
    plugins: [
        ...createCommonPlugins(isProduction),
        copy({
            targets: [
                {
                    src: ['./src/lang/*.yaml'],
                    dest: './dist/lang',
                    transform: (content) => {
                        try {
                            const lang = yaml.load(content, {
                                schema: yaml.JSON_SCHEMA,
                                strict: true
                            });
                            return JSON.stringify(lang, null, isProduction ? 0 : 2);
                        } catch (error) {
                            console.error('Error transforming YAML:', error);
                            throw error;
                        }
                    },
                    rename: (name) => `${name}.json`
                }
            ],
            hookTimeout: 30000
        })
    ]
};

// Test bundle configuration
const tests = {
    ...sharedConfig,
    input: 'src/**/*.test.js',
    output: {
        file: `dist/house-rules.test.js`,
        format: 'es',
        sourcemap: true,
        banner,
        compact: false
    },
    plugins: [
        match({
            // Add specific patterns if needed
            include: ['**/*.test.js']
        }),
        combine({
            // Add combine options if needed
        }),
        ...createCommonPlugins(isProduction)
    ]
};

export default (commandLineArgs) => {
    // Allow command line arguments to modify the config
    if (commandLineArgs.watch) {
        console.log('👀 Watching for changes...');
    }

    return [
        main,
        // tests // Uncomment to enable tests
    ];
};
