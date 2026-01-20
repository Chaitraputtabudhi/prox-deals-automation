import * as cheerio from 'cheerio';
import { Deal } from '../types/index.js';
import { getCurrentWeekRange } from '../utils/dates.js';

export async function scrapeSmartAndFinal(): Promise<Deal[]> {
  const deals: Deal[] = [];
  
  try {
    console.log('🕷️  Scraping Smart & Final deals...\n');

    // Note: This URL might change - verify before production
    const url = 'https://www.smartandfinal.com/sm/pickup/rsid/522/circular?c=weekly-ad-savings-01_21_2026-01_27_2026-2-day-a1vh&page=1';
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // IMPORTANT: Update these selectors based on actual website
    // Inspect the page to find correct CSS selectors
    $('.weekly-ad-item, .deal-card, .product-item').each((index, element) => {
      try {
        const $item = $(element);
        
        // Extract deal information (adjust selectors!)
        const product = $item.find('.product-name, h3, .title').first().text().trim();
        const priceText = $item.find('.price, .sale-price, .amount').first().text().trim();
        const price = parsePrice(priceText);
        const size = $item.find('.size, .quantity, .unit').first().text().trim() || 'each';
        const category = inferCategory(product);
        
        const { start, end } = getCurrentWeekRange();

        if (product && price > 0) {
          deals.push({
            retailer: 'Smart & Final',
            product,
            size,
            price,
            start,
            end,
            category
          });

          console.log(`  ✓ Found: ${product} - $${price}`);
        }
      } catch (error) {
        console.error('  ✗ Error parsing item:', error);
      }
    });

    console.log(`\n✅ Scraped ${deals.length} deals from Smart & Final\n`);
    
  } catch (error: any) {
    console.error('❌ Scraping failed:', error.message);
  }

  return deals;
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  
  // Handle "2 for $5" type deals
  if (priceText.toLowerCase().includes('for')) {
    const match = priceText.match(/(\d+)\s*for\s*\$?(\d+\.?\d*)/i);
    if (match) {
      return parseFloat(match[2]) / parseInt(match[1]);
    }
  }
  
  return price || 0;
}

function inferCategory(product: string): string {
  const lower = product.toLowerCase();
  
  if (lower.match(/chicken|beef|pork|fish|salmon|turkey|meat/)) return 'protein';
  if (lower.match(/apple|banana|grape|orange|avocado|berry|produce/)) return 'produce';
  if (lower.match(/milk|cheese|yogurt|butter|cream/)) return 'dairy';
  if (lower.match(/soap|detergent|cleaner|paper|tissue/)) return 'household';
  if (lower.match(/bread|pasta|rice|cereal|beans/)) return 'pantry';
  
  return 'other';
}
