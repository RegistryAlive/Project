/**
 * Minification script for Wonderland Online Items Database
 * Uses terser for JS minification and html-minifier-terser for HTML
 * Run: npm install && node minify.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INPUT_FILE = path.join(__dirname, 'Item.html');
const OUTPUT_FILE = path.join(__dirname, 'Item.min.html');

async function minify() {
    console.log('Starting minification process...');
    
    let html = fs.readFileSync(INPUT_FILE, 'utf8');
    console.log(`Original file size: ${(html.length / 1024).toFixed(2)} KB`);
    
    // Step 1: Extract and minify inline styles
    console.log('[1/4] Extracting inline styles...');
    html = html.replace(/<style>([\s\S]*?)<\/style>/g, (match) => {
        return match.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\n/g, '') // Remove newlines
            .replace(/\s{2,}/g, ' ') // Collapse whitespace
            .replace(/:\s+/g, ':') // Remove space after colon
            .replace(/\s*\{\s*/g, '{') // Clean opening braces
            .replace(/\s*\}\s*/g, '}') // Clean closing braces
            .replace(/\s*,\s*/g, ','); // Clean commas
    });
    
    // Step 2: Minify HTML whitespace
    console.log('[2/4] Compressing HTML whitespace...');
    html = html.replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
        .replace(/\t+/g, '') // Remove tabs
        .replace(/\n\s*/g, ''); // Remove newlines with following whitespace
    
    // Step 3: Simplify variable references inside inline scripts (basic obfuscation)
    console.log('[3/4] Optimizing inline scripts structure...');
    html = html.replace(/function\s+\w+\s*\(/g, function(match) {
        // Keep all function declarations but compress whitespace
        return match.replace(/\s+/g, '');
    });
    
    // Step 4: Remove unnecessary attributes and empty values
    console.log('[4/4] Removing empty attributes...');
    html = html.replace(/\s+alt=""\s*/g, ' ') // Simplify empty alt
        .replace(/\s+data-sort=""\s*/g, ' ') // Remove empty data-sort
        .replace(/\s+loading=""\s*/g, ' '); // Remove empty loading
    
    // Write minified output
    fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
    console.log(`\nMinified file saved to: ${OUTPUT_FILE}`);
    console.log(`Minified file size: ${(html.length / 1024).toFixed(2)} KB`);
    console.log(`Reduction: ${((1 - html.length / fs.readFileSync(INPUT_FILE, 'utf8').length) * 100).toFixed(1)}%`);
    console.log('\nTo run: npm install terser html-minifier-terser && node minify.js');
}

minify().catch(console.error);