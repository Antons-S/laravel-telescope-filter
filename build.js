#!/usr/bin/env node

/**
 * Build script for Telescope Filter Bookmarklet
 *
 * This script:
 * 1. Reads the source file
 * 2. Minifies it using Terser
 * 3. Creates two output files:
 *    - bookmarklet.txt: Ready-to-use bookmarklet with javascript: prefix
 *    - bookmarklet.js: Minified code without prefix (for debugging)
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const SOURCE_FILE = path.join(__dirname, 'src', 'telescope-filter.js');
const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_BOOKMARKLET = path.join(DIST_DIR, 'bookmarklet.txt');
const OUTPUT_JS = path.join(DIST_DIR, 'bookmarklet.js');

// Terser options for aggressive minification
const terserOptions = {
  compress: {
    passes: 2,
    unsafe: true,
    unsafe_comps: true,
    unsafe_Function: true,
    unsafe_math: true,
    unsafe_proto: true,
    unsafe_regexp: true,
    unsafe_undefined: true,
    dead_code: true,
    drop_console: false, // Keep console.log for Load More feature
    drop_debugger: true,
    evaluate: true,
    conditionals: true,
    booleans: true,
    loops: true,
    unused: true,
    hoist_funs: true,
    keep_fargs: false,
    keep_fnames: false,
    hoist_props: true,
    join_vars: true,
    side_effects: true
  },
  mangle: {
    toplevel: true,
    safari10: true
  },
  format: {
    comments: false,
    semicolons: true
  }
};

async function build() {
  console.log('🔨 Building Telescope Filter Bookmarklet...\n');

  try {
    // Ensure dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
      console.log('✓ Created dist directory');
    }

    // Read source file
    console.log('📖 Reading source file...');
    const sourceCode = fs.readFileSync(SOURCE_FILE, 'utf8');
    const sourceSize = Buffer.byteLength(sourceCode, 'utf8');
    console.log(`✓ Source file size: ${formatBytes(sourceSize)}`);

    // Minify
    console.log('\n⚡ Minifying code...');
    const result = await minify(sourceCode, terserOptions);

    if (result.error) {
      throw result.error;
    }

    const minifiedCode = result.code;
    const minifiedSize = Buffer.byteLength(minifiedCode, 'utf8');
    const reduction = ((1 - minifiedSize / sourceSize) * 100).toFixed(1);

    console.log(`✓ Minified size: ${formatBytes(minifiedSize)} (${reduction}% reduction)`);

    // Create bookmarklet with javascript: prefix
    const bookmarklet = 'javascript:' + encodeURIComponent(minifiedCode);
    const bookmarkletSize = Buffer.byteLength(bookmarklet, 'utf8');

    // Write files
    console.log('\n💾 Writing output files...');
    fs.writeFileSync(OUTPUT_BOOKMARKLET, bookmarklet, 'utf8');
    console.log(`✓ ${path.basename(OUTPUT_BOOKMARKLET)} (${formatBytes(bookmarkletSize)})`);

    fs.writeFileSync(OUTPUT_JS, minifiedCode, 'utf8');
    console.log(`✓ ${path.basename(OUTPUT_JS)} (${formatBytes(minifiedSize)})`);

    // Summary
    console.log('\n📊 Build Summary:');
    console.log('─'.repeat(50));
    console.log(`Source:      ${formatBytes(sourceSize)}`);
    console.log(`Minified:    ${formatBytes(minifiedSize)} (${reduction}% smaller)`);
    console.log(`Bookmarklet: ${formatBytes(bookmarkletSize)} (URL encoded)`);
    console.log('─'.repeat(50));

    console.log('\n✅ Build completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Open ${OUTPUT_BOOKMARKLET}`);
    console.log(`   2. Copy the entire content`);
    console.log(`   3. Create a new bookmark and paste it as the URL`);

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Watch mode
if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...\n');
  fs.watch(SOURCE_FILE, async (eventType) => {
    if (eventType === 'change') {
      console.log('\n🔄 Source file changed, rebuilding...\n');
      await build();
      console.log('\n👀 Watching for changes...\n');
    }
  });
  build();
} else {
  build();
}
