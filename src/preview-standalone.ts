// src/preview-standalone.ts
// Standalone preview that works without database credentials

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEmailHTML } from './templates/weeklyDeals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePreview() {
  console.log('🚀 Prox Weekly Deals - Preview Generator');
  console.log('=========================================\n');
  console.log('📄 Generating email preview (no database needed)...\n');

  // Sample deals for preview
  const sampleDeals = [
    {
      retailer: 'Vons',
      product: 'Seedless Grapes (Red/Green)',
      size: 'per lb',
      price: 0.99,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'produce',
    },
    {
      retailer: 'Whole Foods',
      product: 'Organic Avocados',
      size: 'each',
      price: 1.49,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'produce',
    },
    {
      retailer: 'Aldi',
      product: 'Organic Blackberries',
      size: '6 oz',
      price: 1.79,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'produce',
    },
    {
      retailer: 'Walmart',
      product: 'Great Value Milk (Gallon)',
      size: '1 gallon',
      price: 2.78,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'dairy',
    },
    {
      retailer: 'Ralphs',
      product: 'Boneless Skinless Chicken Breasts',
      size: 'per lb',
      price: 2.99,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'protein',
    },
    {
      retailer: 'Sprouts',
      product: 'Wild Caught Salmon Fillet',
      size: 'per lb',
      price: 8.99,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'protein',
    },
  ];

  // Generate HTML
  const html = generateEmailHTML('Preview User', sampleDeals);
  
  // Save to file
  const previewPath = path.join(__dirname, '../deals-preview.html');
  await fs.writeFile(previewPath, html);

  console.log(`✅ Preview generated successfully!`);
  console.log(`📂 Location: ${previewPath}`);
  console.log(`\n💡 Open this file in your browser to see the email design\n`);
  
  // Also output some info
  console.log('📊 Preview Statistics:');
  console.log(`   • Total deals: ${sampleDeals.length}`);
  console.log(`   • Retailers: ${new Set(sampleDeals.map(d => d.retailer)).size}`);
  console.log(`   • Price range: $${Math.min(...sampleDeals.map(d => d.price)).toFixed(2)} - $${Math.max(...sampleDeals.map(d => d.price)).toFixed(2)}`);
  console.log('');
}

generatePreview().catch(error => {
  console.error('❌ Preview generation failed:', error);
  process.exit(1);
});