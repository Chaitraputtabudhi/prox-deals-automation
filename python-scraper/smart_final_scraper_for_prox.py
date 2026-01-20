#!/usr/bin/env python3
"""
Smart & Final Scraper for Prox Deals - Production Ready
=========================================================

This scraper extracts weekly deals from Smart & Final and outputs
JSON that's directly compatible with your TypeScript project.

Features:
- Automatic category inference
- Multiple selector strategies
- Price parsing (handles "2 for $5" deals)
- Date range generation
- TypeScript interface validation
- Offline testing mode

Usage:
    python smart_final_scraper_for_prox.py              # Scrape store 522
    python smart_final_scraper_for_prox.py 123          # Scrape store 123
    python smart_final_scraper_for_prox.py --test       # Test with sample HTML
"""

import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import sys
import argparse


try:
    from bs4 import BeautifulSoup
    import requests
except ImportError:
    print("ERROR: Required packages not installed")
    print("Install with: pip install beautifulsoup4 requests --break-system-packages")
    sys.exit(1)


# TypeScript interface for reference:
# interface Deal {
#   retailer: string;
#   product: string;
#   size: string;
#   price: number;
#   start: string;    // YYYY-MM-DD
#   end: string;      // YYYY-MM-DD
#   category: string;
# }


class SmartFinalScraper:
    """
    Production-ready scraper for Smart & Final weekly circular
    """
    
    # Known selectors (update these as website changes)
    SELECTORS = {
        'item_container': [
            '[data-testid="circular-item"]',
            '.CircularItemCard',
            '.product-card',
            '.circular-item',
            '.deal-card',
            '[class*="CircularItem"]',
        ],
        'product_name': [
            '[data-testid="product-name"]',
            '.product-name',
            '.product-title',
            'h3',
            'h4',
            '[class*="title"]',
            '[class*="name"]',
        ],
        'price': [
            '[data-testid="price"]',
            '.price',
            '.sale-price',
            '.current-price',
            '[class*="price"]',
        ],
        'size': [
            '[data-testid="size"]',
            '.size',
            '.unit',
            '.quantity',
            '[class*="size"]',
            '[class*="unit"]',
        ],
    }
    
    def __init__(self, store_id: str = "522", verbose: bool = True):
        self.store_id = store_id
        self.verbose = verbose
        self.base_url = f"https://www.smartandfinal.com/sm/pickup/rsid/{store_id}/circular"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    def log(self, message: str, level: str = "info"):
        """Log message if verbose mode enabled"""
        if self.verbose:
            icons = {"info": "ℹ️", "success": "✅", "error": "❌", "warning": "⚠️"}
            icon = icons.get(level, "•")
            print(f"{icon} {message}")
    
    def scrape(self, html_content: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scrape deals from Smart & Final
        
        Args:
            html_content: Optional HTML content for testing (if None, fetches from web)
        
        Returns:
            List of deals compatible with TypeScript Deal interface
        """
        self.log(f"Scraping Smart & Final (Store {self.store_id})...")
        
        if html_content:
            self.log("Using provided HTML content (test mode)")
            soup = BeautifulSoup(html_content, 'html.parser')
        else:
            self.log(f"Fetching: {self.base_url}")
            soup = self._fetch_page()
            if not soup:
                return []
        
        # Save for debugging
        self._save_debug_html(soup)
        
        # Find deal items
        items = self._find_deal_items(soup)
        if not items:
            self.log("No deal items found", "error")
            return []
        
        self.log(f"Found {len(items)} potential deal items", "success")
        
        # Parse each item
        deals = []
        for i, item in enumerate(items, 1):
            try:
                deal = self._parse_deal(item)
                if deal:
                    deals.append(deal)
                    self.log(f"  [{i:3d}] ✓ {deal['product'][:40]:40s} ${deal['price']:6.2f}")
                else:
                    self.log(f"  [{i:3d}] ⊘ Skipped (incomplete data)")
            except Exception as e:
                self.log(f"  [{i:3d}] ✗ Parse error: {e}", "error")
        
        self.log(f"Successfully scraped {len(deals)} deals", "success")
        return deals
    
    def _fetch_page(self) -> Optional[BeautifulSoup]:
        """Fetch and parse HTML from Smart & Final"""
        try:
            response = requests.get(
                self.base_url,
                headers=self.headers,
                timeout=15,
                allow_redirects=True
            )
            response.raise_for_status()
            
            self.log(f"Page fetched ({len(response.content):,} bytes)", "success")
            return BeautifulSoup(response.content, 'html.parser')
            
        except requests.exceptions.RequestException as e:
            self.log(f"Network error: {e}", "error")
            return None
    
    def _find_deal_items(self, soup: BeautifulSoup) -> List:
        """Find all deal item elements using multiple selector strategies"""
        
        # Try known selectors first
        for selector in self.SELECTORS['item_container']:
            items = soup.select(selector)
            if items:
                self.log(f"Items found with selector: {selector}", "success")
                return items
        
        # Fallback: analyze page structure
        self.log("Known selectors failed, analyzing page...", "warning")
        return self._analyze_and_find_items(soup)
    
    def _analyze_and_find_items(self, soup: BeautifulSoup) -> List:
        """Fallback: analyze page structure to find deal items"""
        
        # Look for repeating elements with product-like content
        keywords = ['product', 'item', 'card', 'deal', 'circular', 'offer']
        
        for keyword in keywords:
            elements = soup.find_all(class_=re.compile(keyword, re.IGNORECASE))
            if len(elements) > 5:  # Need multiple items to be a list
                self.log(f"Found {len(elements)} elements with class*='{keyword}'")
                return elements
        
        self.log("Could not identify deal items", "error")
        return []
    
    def _parse_deal(self, item) -> Optional[Dict[str, Any]]:
        """
        Parse a single deal item into TypeScript-compatible format
        
        Returns None if essential data is missing
        """
        
        # Extract product name
        product = self._extract_text(item, self.SELECTORS['product_name'])
        if not product:
            return None
        
        # Extract and parse price
        price_text = self._extract_text(item, self.SELECTORS['price'])
        price = self._parse_price(price_text)
        if price <= 0:
            return None
        
        # Extract size (optional, defaults to 'each')
        size = self._extract_text(item, self.SELECTORS['size'])
        if not size:
            # Try to extract from product name
            size = self._extract_size_from_text(product)
            if size:
                product = self._remove_size_from_product(product, size)
        if not size:
            size = 'each'
        
        # Get date range for current week
        start_date, end_date = self._get_week_range()
        
        # Infer category from product name
        category = self._infer_category(product)
        
        # Clean up product name
        product = self._clean_product_name(product)
        
        return {
            'retailer': 'Smart & Final',
            'product': product,
            'size': size,
            'price': round(price, 2),
            'start': start_date,
            'end': end_date,
            'category': category
        }
    
    def _extract_text(self, element, selectors: List[str]) -> str:
        """Extract text using multiple selector strategies"""
        for selector in selectors:
            elem = element.select_one(selector)
            if elem:
                text = elem.get_text(strip=True)
                if text:
                    return text
        return ""
    
    def _parse_price(self, price_text: str) -> float:
        """
        Parse price from various formats:
        - $5.99
        - 5.99
        - 2 for $5
        - $1.99 ea
        """
        if not price_text:
            return 0.0
        
        # Handle "X for $Y" deals
        for_match = re.search(r'(\d+)\s*for\s*\$?(\d+\.?\d*)', price_text, re.IGNORECASE)
        if for_match:
            quantity = int(for_match.group(1))
            total = float(for_match.group(2))
            return total / quantity
        
        # Extract first price-like number
        price_match = re.search(r'\$?(\d+\.?\d*)', price_text)
        if price_match:
            return float(price_match.group(1))
        
        return 0.0
    
    def _extract_size_from_text(self, text: str) -> Optional[str]:
        """Extract size/unit from text (e.g., '16 oz', '1 lb', '2 liter')"""
        patterns = [
            r'\b(\d+\.?\d*\s*(?:oz|lb|lbs|g|kg|ml|l|liter|gallon|gal|ct|count|pk|pack))\b',
            r'\b(per\s+lb|per\s+pound)\b',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _remove_size_from_product(self, product: str, size: str) -> str:
        """Remove size information from product name"""
        return re.sub(r'\s*' + re.escape(size) + r'\s*', ' ', product, flags=re.IGNORECASE).strip()
    
    def _clean_product_name(self, product: str) -> str:
        """Clean up product name"""
        # Remove multiple spaces
        product = re.sub(r'\s+', ' ', product)
        # Remove leading/trailing special characters
        product = product.strip(' -,.')
        return product
    
    def _infer_category(self, product: str) -> str:
        """
        Infer category from product name
        
        Categories match your TypeScript project:
        produce, protein, dairy, household, pantry, snacks, beverages, other
        """
        lower = product.lower()
        
        # Protein
        protein_keywords = [
            'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'meat',
            'steak', 'sausage', 'bacon', 'ham', 'ribs', 'ground beef', 'tuna'
        ]
        if any(kw in lower for kw in protein_keywords):
            return 'protein'
        
        # Produce
        produce_keywords = [
            'apple', 'banana', 'grape', 'orange', 'avocado', 'berry', 'lettuce',
            'tomato', 'onion', 'potato', 'carrot', 'celery', 'pepper', 'fruit',
            'vegetable', 'produce', 'organic', 'broccoli', 'cauliflower'
        ]
        if any(kw in lower for kw in produce_keywords):
            return 'produce'
        
        # Dairy
        dairy_keywords = [
            'milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'dairy',
            'cheddar', 'mozzarella', 'sour cream', 'whipped cream'
        ]
        if any(kw in lower for kw in dairy_keywords):
            return 'dairy'
        
        # Household
        household_keywords = [
            'soap', 'detergent', 'cleaner', 'paper', 'tissue', 'towel',
            'tide', 'dawn', 'bleach', 'wipes', 'trash bag', 'toilet paper'
        ]
        if any(kw in lower for kw in household_keywords):
            return 'household'
        
        # Pantry
        pantry_keywords = [
            'bread', 'pasta', 'rice', 'cereal', 'beans', 'flour', 'sugar',
            'oil', 'can', 'canned', 'sauce', 'grain', 'soup'
        ]
        if any(kw in lower for kw in pantry_keywords):
            return 'pantry'
        
        # Snacks
        snack_keywords = [
            'chip', 'cookie', 'cracker', 'candy', 'snack', 'popcorn',
            'pretzel', 'nut', 'granola', 'bar'
        ]
        if any(kw in lower for kw in snack_keywords):
            return 'snacks'
        
        # Beverages
        beverage_keywords = [
            'soda', 'juice', 'water', 'coffee', 'tea', 'beer', 'wine',
            'drink', 'beverage', 'cola', 'pepsi', 'coke'
        ]
        if any(kw in lower for kw in beverage_keywords):
            return 'beverages'
        
        return 'other'
    
    def _get_week_range(self) -> tuple[str, str]:
        """Get current week date range (today to +7 days)"""
        today = datetime.now()
        week_end = today + timedelta(days=7)
        
        return (
            today.strftime('%Y-%m-%d'),
            week_end.strftime('%Y-%m-%d')
        )
    
    def _save_debug_html(self, soup: BeautifulSoup):
        """Save HTML for debugging"""
        try:
            with open('smart_final_debug.html', 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            self.log("Debug HTML saved to smart_final_debug.html")
        except Exception as e:
            self.log(f"Could not save debug HTML: {e}", "warning")


def validate_deals(deals: List[Dict[str, Any]]) -> bool:
    """
    Validate deals match TypeScript Deal interface
    
    interface Deal {
      retailer: string;
      product: string;
      size: string;
      price: number;
      start: string;
      end: string;
      category: string;
    }
    """
    required_fields = ['retailer', 'product', 'size', 'price', 'start', 'end', 'category']
    
    for i, deal in enumerate(deals, 1):
        # Check required fields
        missing = [f for f in required_fields if f not in deal]
        if missing:
            print(f"❌ Deal {i} missing: {missing}")
            return False
        
        # Check types
        if not isinstance(deal['price'], (int, float)):
            print(f"❌ Deal {i} price must be number, got {type(deal['price'])}")
            return False
        
        if not all(isinstance(deal[f], str) for f in ['retailer', 'product', 'size', 'category']):
            print(f"❌ Deal {i} has invalid string field types")
            return False
        
        # Validate date format
        for date_field in ['start', 'end']:
            try:
                datetime.strptime(deal[date_field], '%Y-%m-%d')
            except ValueError:
                print(f"❌ Deal {i} has invalid {date_field} date: {deal[date_field]}")
                return False
    
    print("✅ All deals valid for TypeScript interface")
    return True


def save_json(deals: List[Dict[str, Any]], filename: str = "deals.json"):
    """Save deals to JSON file"""
    print(f"\n💾 Saving to {filename}...")
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(deals, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved {len(deals)} deals")


def print_summary(deals: List[Dict[str, Any]]):
    """Print deal summary statistics"""
    if not deals:
        return
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total deals: {len(deals)}")
    
    # By category
    categories = {}
    for deal in deals:
        cat = deal['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nBy category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat:15s} {count:3d} deals")
    
    # Price stats
    prices = [d['price'] for d in deals]
    print(f"\nPrice range: ${min(prices):.2f} - ${max(prices):.2f}")
    print(f"Average: ${sum(prices)/len(prices):.2f}")
    
    # Sample deals
    print("\nTop 3 cheapest deals:")
    for deal in sorted(deals, key=lambda x: x['price'])[:3]:
        print(f"  ${deal['price']:6.2f} - {deal['product'][:45]}")


def create_sample_html() -> str:
    """Create sample HTML for testing"""
    return """
    <html>
    <body>
        <div class="circular-item" data-testid="circular-item">
            <h3 class="product-name">Organic Avocados</h3>
            <span class="price">$1.49</span>
            <span class="size">each</span>
        </div>
        <div class="circular-item" data-testid="circular-item">
            <h3 class="product-name">Ground Beef 80/20</h3>
            <span class="price">$3.99</span>
            <span class="size">per lb</span>
        </div>
        <div class="circular-item" data-testid="circular-item">
            <h3 class="product-name">Tide Laundry Detergent</h3>
            <span class="price">2 for $10</span>
            <span class="size">100 oz</span>
        </div>
    </body>
    </html>
    """


def main():
    parser = argparse.ArgumentParser(
        description='Scrape Smart & Final deals for Prox project'
    )
    parser.add_argument(
        'store_id',
        nargs='?',
        default='522',
        help='Smart & Final store ID (default: 522)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Run in test mode with sample HTML'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress detailed logging'
    )
    parser.add_argument(
        '--output',
        default='deals.json',
        help='Output filename (default: deals.json)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Smart & Final Scraper for Prox Deals")
    print("=" * 60)
    print()
    
    # Initialize scraper
    scraper = SmartFinalScraper(
        store_id=args.store_id,
        verbose=not args.quiet
    )
    
    # Scrape deals
    if args.test:
        print("🧪 Running in TEST mode with sample data\n")
        deals = scraper.scrape(html_content=create_sample_html())
    else:
        deals = scraper.scrape()
    
    # Handle results
    if not deals:
        print("\n⚠️  No deals found")
        print("\nPossible reasons:")
        print("  1. Website structure changed (check smart_final_debug.html)")
        print("  2. No active deals for this store")
        print("  3. Network/access issues")
        print("\nTry running with --test flag to verify scraper works")
        return 1
    
    # Validate
    if not validate_deals(deals):
        print("\n❌ Validation failed - deals not compatible with TypeScript")
        return 1
    
    # Save
    save_json(deals, args.output)
    
    # Summary
    print_summary(deals)
    
    # Integration instructions
    print("\n" + "=" * 60)
    print("INTEGRATION WITH TYPESCRIPT PROJECT")
    print("=" * 60)
    print(f"\n1. Copy {args.output} to your project's data/ folder:")
    print(f"   cp {args.output} /path/to/prox-deals-automation/data/")
    print("\n2. Run ingestion:")
    print("   npm run ingest")
    print("\n3. Or run full workflow:")
    print("   npm run send:weekly")
    
    return 0


if __name__ == "__main__":
    try:
        exit(main())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)