// Main entry point - CLI for Prox Deals automation
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestDeals, ingestUsers } from './services/ingestion.js';
import { sendWeeklyDeals } from './services/email.js';
import { generateEmailHTML } from './templates/weeklyDeals.js';
import { Deal, User } from './types/index.js';

// Get directory name in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main function - routes to different actions based on CLI args
 */
async function main() {
  console.log('🚀 Prox Weekly Deals Automation');
  console.log('================================\n');

  // Parse command line arguments
  const action = process.argv.find((arg) => arg.startsWith('--action='))?.split('=')[1] || 'send-weekly';

  try {
    switch (action) {
      case 'ingest':
        await runIngest();
        break;
      
      case 'send-weekly':
        await runSendWeekly();
        break;
      
      case 'preview':
        await runPreview();
        break;
      
      default:
        console.log('❌ Unknown action:', action);
        console.log('\nAvailable actions:');
        console.log('  --action=ingest      : Ingest data into database');
        console.log('  --action=send-weekly : Ingest data and send emails (default)');
        console.log('  --action=preview     : Generate HTML preview without sending');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Ingest deals and users into database
 */
async function runIngest() {
  try {
    // Load users data
    const usersPath = path.join(__dirname, '../data/users.json');
    const usersData: User[] = JSON.parse(await fs.readFile(usersPath, 'utf-8'));

    // Load deals data
    const dealsPath = path.join(__dirname, '../data/deals.json');
    const dealsData: Deal[] = JSON.parse(await fs.readFile(dealsPath, 'utf-8'));

    // Ingest in order (users first, then deals)
    await ingestUsers(usersData);
    await ingestDeals(dealsData);

    console.log('✅ Ingestion complete!\n');
  } catch (error: any) {
    console.error('❌ Ingestion failed:', error.message);
    throw error;
  }
}

/**
 * Complete workflow: ingest data and send emails
 */
async function runSendWeekly() {
  console.log('Running full weekly automation...\n');
  
  // Step 1: Ingest data
  await runIngest();
  
  // Step 2: Send emails
  await sendWeeklyDeals();
  
  console.log('🎉 Done! Check your inbox.\n');
}

/**
 * Generate preview HTML without sending
 */
async function runPreview() {
  console.log('📄 Generating email preview...\n');

  // Sample deals for preview
  const sampleDeals = [
    {
      retailer: 'Whole Foods',
      product: 'Organic Avocados',
      size: 'each',
      price: 1.49,
      start_date: '2025-09-01',
      end_date: '2025-09-07',
      category: 'produce',
    },
    {
      retailer: 'Sprouts',
      product: 'Wild Caught Salmon Fillet',
      size: 'per lb',
      price: 8.99,
      start_date: '2025-09-01',
      end_date: '2025-09-07',
      category: 'protein',
    },
    {
      retailer: 'Whole Foods',
      product: 'Organic Blackberries',
      size: '6 oz',
      price: 1.79,
      start_date: '2025-09-01',
      end_date: '2025-09-07',
      category: 'produce',
    },
  ];

  // Generate HTML
  const html = generateEmailHTML('Preview User', sampleDeals);
  
  // Save to file
  const previewPath = path.join(__dirname, '../deals-preview.html');
  await fs.writeFile(previewPath, html);

  console.log(`✅ Preview generated: ${previewPath}`);
  console.log('📂 Open this file in your browser to see the email design\n');
}

// Run main function
main();