# Smart & Final Scraper Integration Guide

## Quick Start

### 1. Install Dependencies
```bash
pip install beautifulsoup4 requests --break-system-packages
```

### 2. Run Scraper
```bash
# Test mode (no network needed)
python smart_final_scraper_for_prox.py --test

# Production mode (scrape live data)
python smart_final_scraper_for_prox.py

# Different store
python smart_final_scraper_for_prox.py 123

# Custom output file
python smart_final_scraper_for_prox.py --output weekly_deals.json
```

### 3. Integrate with TypeScript Project
```bash
# Copy scraped deals to your project
cp deals.json /path/to/prox-deals-automation/data/

# Ingest into Supabase
cd /path/to/prox-deals-automation
npm run ingest

# Or run full automation
npm run send:weekly
```

## Output Format

The scraper outputs JSON that matches your TypeScript `Deal` interface:

```json
[
  {
    "retailer": "Smart & Final",
    "product": "Organic Avocados",
    "size": "each",
    "price": 1.49,
    "start": "2026-01-20",
    "end": "2026-01-27",
    "category": "produce"
  }
]
```

### TypeScript Interface Compatibility

```typescript
interface Deal {
  retailer: string;   // Always "Smart & Final"
  product: string;    // Clean product name
  size: string;       // "each", "per lb", "16 oz", etc.
  price: number;      // Parsed numeric price
  start: string;      // YYYY-MM-DD format
  end: string;        // YYYY-MM-DD format (start + 7 days)
  category: string;   // Auto-inferred category
}
```

## Features

### ✅ Automatic Features

1. **Category Inference**
   - Automatically categorizes products
   - Categories: `produce`, `protein`, `dairy`, `household`, `pantry`, `snacks`, `beverages`, `other`

2. **Price Parsing**
   - Handles various formats: `$5.99`, `5.99`, `2 for $5`
   - Calculates unit price for multi-buy deals

3. **Size Extraction**
   - Extracts from separate fields or product name
   - Common units: oz, lb, gallon, ct, etc.
   - Defaults to "each" if not found

4. **Date Range**
   - Automatically generates current week (today + 7 days)
   - YYYY-MM-DD format compatible with TypeScript

5. **Data Validation**
   - Validates all fields match TypeScript interface
   - Type checking for numbers, strings, dates
   - Ensures no missing required fields

### 🔧 Configuration Options

```bash
# Help
python smart_final_scraper_for_prox.py --help

# Quiet mode (less output)
python smart_final_scraper_for_prox.py --quiet

# Custom output file
python smart_final_scraper_for_prox.py --output my_deals.json

# Test mode
python smart_final_scraper_for_prox.py --test
```

## Troubleshooting

### No Deals Found

If the scraper returns no deals:

1. **Check Debug File**
   ```bash
   open smart_final_debug.html
   # Inspect the HTML structure
   ```

2. **Update Selectors**
   The scraper uses multiple selector strategies. If website changed, update in code:
   ```python
   SELECTORS = {
       'item_container': [
           '[data-testid="circular-item"]',  # Add new selectors here
           '.CircularItemCard',
           # ...
       ],
   }
   ```

3. **Test Mode**
   Verify scraper logic works:
   ```bash
   python smart_final_scraper_for_prox.py --test
   ```

### Network Errors

```bash
# Check if site is accessible
curl -I https://www.smartandfinal.com/sm/pickup/rsid/522/circular

# Try different store ID
python smart_final_scraper_for_prox.py 456
```

### Validation Errors

If deals fail validation:
- Check the error message for specific issues
- Verify date formats are YYYY-MM-DD
- Ensure prices are numbers (not strings)
- Confirm all required fields present

## Automation

### Cron Job (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Run every Sunday at 6am
0 6 * * 0 /usr/bin/python3 /path/to/smart_final_scraper_for_prox.py && cp deals.json /path/to/prox-deals-automation/data/ && cd /path/to/prox-deals-automation && npm run ingest
```

### GitHub Actions
```yaml
name: Scrape Smart & Final

on:
  schedule:
    - cron: '0 6 * * 0'  # Sunday 6am
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install beautifulsoup4 requests
      
      - name: Run scraper
        run: python smart_final_scraper_for_prox.py
      
      - name: Copy to data folder
        run: cp deals.json data/deals.json
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install npm dependencies
        run: npm ci
      
      - name: Ingest deals
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run ingest
```

### Python Script Integration

You can also call the scraper from Python:

```python
from smart_final_scraper_for_prox import SmartFinalScraper, save_json

# Initialize
scraper = SmartFinalScraper(store_id="522", verbose=True)

# Scrape
deals = scraper.scrape()

# Save
save_json(deals, "deals.json")

# Use deals data
for deal in deals:
    print(f"{deal['product']}: ${deal['price']}")
```

## Categories

The scraper automatically categorizes products:

| Category | Keywords |
|----------|----------|
| `produce` | apple, banana, avocado, lettuce, tomato, organic fruit/veg |
| `protein` | chicken, beef, pork, fish, salmon, turkey, meat, bacon |
| `dairy` | milk, cheese, yogurt, butter, cream, eggs |
| `household` | soap, detergent, paper towels, tissues, cleaners |
| `pantry` | bread, pasta, rice, cereal, canned goods, flour |
| `snacks` | chips, cookies, crackers, candy, popcorn |
| `beverages` | soda, juice, water, coffee, tea, beer, wine |
| `other` | Everything else |

## Advanced Usage

### Multiple Stores

Scrape multiple stores in parallel:

```bash
#!/bin/bash
# scrape_all_stores.sh

stores=("522" "456" "789")

for store in "${stores[@]}"; do
    python smart_final_scraper_for_prox.py "$store" --output "deals_$store.json" &
done

wait
echo "All stores scraped!"

# Merge results
jq -s 'add' deals_*.json > all_deals.json
```

### Custom Categories

Modify the `_infer_category()` method to add custom categories:

```python
def _infer_category(self, product: str) -> str:
    lower = product.lower()
    
    # Add your custom categories
    if 'frozen' in lower:
        return 'frozen'
    
    if 'organic' in lower and any(kw in lower for kw in ['fruit', 'vegetable']):
        return 'organic_produce'
    
    # ... rest of existing categories
```

### Data Pipeline

Integrate with your data pipeline:

```python
import json
from smart_final_scraper_for_prox import SmartFinalScraper
import psycopg2  # or your database library

def scrape_and_ingest():
    # Scrape
    scraper = SmartFinalScraper()
    deals = scraper.scrape()
    
    # Connect to database
    conn = psycopg2.connect("postgresql://...")
    
    # Insert deals
    for deal in deals:
        # Your database insertion logic
        pass
    
    conn.commit()
    conn.close()
```

## Sample Output

Running the scraper will produce output like:

```
============================================================
Smart & Final Scraper for Prox Deals
============================================================

ℹ️ Scraping Smart & Final (Store 522)...
ℹ️ Fetching: https://www.smartandfinal.com/...
✅ Page fetched (245,123 bytes)
ℹ️ Debug HTML saved to smart_final_debug.html
✅ Items found with selector: .CircularItemCard
✅ Found 47 potential deal items
ℹ️   [  1] ✓ Organic Avocados                         $  1.49
ℹ️   [  2] ✓ Ground Beef 80/20                        $  3.99
ℹ️   [  3] ✓ Tide Laundry Detergent 100 oz           $ 13.99
...
✅ Successfully scraped 45 deals
✅ All deals valid for TypeScript interface

💾 Saving to deals.json...
✅ Saved 45 deals

============================================================
SUMMARY
============================================================
Total deals: 45

By category:
  produce          12 deals
  protein           8 deals
  household         7 deals
  pantry            6 deals
  dairy             5 deals
  snacks            4 deals
  beverages         3 deals

Price range: $0.99 - $24.99
Average: $7.83
```

## Support

### Common Issues

**Issue**: Selectors not working
- **Solution**: Check `smart_final_debug.html` and update selectors in code

**Issue**: Network timeout
- **Solution**: Increase timeout in `_fetch_page()` method

**Issue**: Wrong categories
- **Solution**: Modify `_infer_category()` keyword lists

### Getting Help

1. Check debug HTML file for page structure
2. Run with `--test` flag to verify logic
3. Update selectors based on current website
4. Review error messages for specific issues

## License

This scraper is designed for personal use with your Prox Deals project.
Respect Smart & Final's robots.txt and terms of service.

---

**Last Updated**: January 2026
**Compatible With**: Prox Deals TypeScript project v1.0.0