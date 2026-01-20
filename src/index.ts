import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestDeals, ingestUsers } from './services/ingestion.js';
import { sendWeeklyDeals } from './services/email.js';
import { generateEmailHTML } from './templates/weeklyDeals.js';
import { Deal, User } from './types/index.js';
import { initSentry } from './config/sentry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🚀 Prox Weekly Deals Automation');
  console.log('================================\n');

  // Initialize Sentry (optional)
  initSentry();

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
      
      case 'scrape':
        await runScrape();
        break;
      
      default:
        console.log('❌ Unknown action:', action);
        console.log('\nAvailable actions:');
        console.log('  --action=ingest      : Ingest data into database');
        console.log('  --action=send-weekly : Ingest data and send emails (default)');
        console.log('  --action=preview     : Generate HTML preview');
        console.log('  --action=scrape      : Scrape deals from retailers');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

async function runIngest() {
  const usersPath = path.join(__dirname, '../data/users.json');
  const usersData: User[] = JSON.parse(await fs.readFile(usersPath, 'utf-8'));

  const dealsPath = path.join(__dirname, '../data/deals.json');
  const dealsData: Deal[] = JSON.parse(await fs.readFile(dealsPath, 'utf-8'));

  await ingestUsers(usersData);
  await ingestDeals(dealsData);

  console.log('✅ Ingestion complete!\n');
}

async function runSendWeekly() {
  console.log('Running full weekly automation...\n');
  await runIngest();
  await sendWeeklyDeals();
  console.log('🎉 Done! Check your inbox.\n');
}

async function runPreview() {
  console.log('📄 Generating email preview...\n');

  const sampleDeals = [
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
      retailer: 'Sprouts',
      product: 'Wild Caught Salmon',
      size: 'per lb',
      price: 8.99,
      start_date: '2026-01-16',
      end_date: '2026-01-23',
      category: 'protein',
    },
  ];

  const html = generateEmailHTML('Preview User', sampleDeals);
  const previewPath = path.join(__dirname, '../deals-preview.html');
  await fs.writeFile(previewPath, html);

  console.log(`✅ Preview: ${previewPath}\n`);
}

async function runScrape() {
  console.log('🕷️  Starting web scraper...\n');
  
  const { scrapeSmartAndFinal } = await import('./services/scraper.js');
  const deals = await scrapeSmartAndFinal();
  
  if (deals.length > 0) {
    console.log(`Found ${deals.length} deals. Ingesting...\n`);
    await ingestDeals(deals);
  } else {
    console.log('No deals found.\n');
  }
}

main();
