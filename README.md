# Prox Weekly Deals Automation

**Automated deal ingestion and personalized email system built with TypeScript, Supabase, and Resend.**

---

## 🎯 Overview

This system automates the weekly deals workflow:
1. **Ingests** deal data from JSON files into Supabase
2. **Filters** deals based on user preferences (preferred retailers)
3. **Sends** beautifully branded HTML emails via Resend
4. **Deduplicates** deals automatically using database constraints

---

## 🏗️ Architecture

```
JSON Data → Ingestion Service → Supabase Database → Email Service → Resend API → User Inbox
                                       ↓
                                Preference Filter
```

### Database Schema

```sql
retailers (id, name, created_at)
products (id, name, size, category, created_at)
deals (id, retailer_id, product_id, price, start_date, end_date, created_at)
  - UNIQUE constraint on (retailer_id, product_id, start_date) for deduplication
users (id, name, email, preferred_retailers[], created_at)
```

**Key Design Decisions:**
- Normalized schema to avoid data duplication
- Composite unique constraint prevents duplicate deals
- Array type for `preferred_retailers` enables efficient filtering
- Indexes on `price`, `dates`, and `retailer_id` for query performance

---

## 📁 Project Structure

```
prox-deals-automation/
├── src/
│   ├── config/
│   │   └── database.ts          # Supabase client configuration
│   ├── services/
│   │   ├── ingestion.ts         # Data ingestion with deduplication
│   │   └── email.ts             # Email generation & sending
│   ├── templates/
│   │   └── weeklyDeals.ts       # HTML email template (Prox branded)
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── index.ts                 # CLI entry point
├── data/
│   ├── deals.json               # Sample deal data
│   └── users.json               # Test user data
├── .env                         # Environment variables (not in git)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free tier)
- Resend API key (free tier: 100 emails/day)

### Installation

```bash
# Clone repository
git clone https://github.com/Chaitraputtabudhi/prox-deals-automation.git
cd prox-deals-automation

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and Resend credentials
```

### Environment Variables

Create `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_your-key
NODE_ENV=development
```

### Database Setup

1. Create Supabase project at https://supabase.com
2. In SQL Editor, run the schema from `scripts/setup-db.sql` (see artifact above)
3. Verify tables created in Table Editor

### Run the System

```bash
# Preview email design (no sending)
npm run preview

# Ingest data only
npm run ingest

# Full workflow: ingest + send emails
npm run send:weekly
```

---

##  Email Features

### Branding
- **Primary color**: #0FB872 (Prox green)
- **Dark accent**: #0A4D3C
- **Background**: #F4FBF8
- Gradient header for visual impact

### Content
- ✅ Personalized greeting with user's name
- ✅ Top 6 deals sorted by lowest price
- ✅ Deals grouped by retailer for easy scanning
- ✅ Product name, size, and price prominently displayed
- ✅ Valid date range for each deal
- ✅ Plain text fallback for accessibility

### Preference Filtering
Each user receives **only deals from their preferred retailers**:
- Sarah Chen: Whole Foods, Sprouts
- Mike Rodriguez: Walmart, Aldi, Smart & Final
- Emma Johnson: Ralphs, Vons, CVS

If no preferences set → receives all deals.

---

## 📊 Sample Data

### Deals (data/deals.json)
8 deals across 8 retailers:
- **Lowest price**: Vons grapes @ $0.99/lb
- **Highest price**: Smart & Final Tide @ $13.99
- **Categories**: Produce, protein, dairy, household

### Users (data/users.json)
3 test users with different retailer preferences.

**Pro tip**: Use Gmail's `+` trick for testing multiple recipients:
- `your-email+test1@gmail.com`
- `your-email+test2@gmail.com`

All deliver to the same inbox but appear as separate recipients!

---

## 🔍 Key Features

### 1. Smart Deduplication
```typescript
// Composite unique constraint prevents duplicates
UNIQUE(retailer_id, product_id, start_date)

// Graceful handling in code
if (error.code === '23505') {
  skipped++;
  console.log('Skipped duplicate');
}
```

### 2. Preference Filtering
```typescript
const userDeals = allDeals.filter(deal => 
  user.preferred_retailers.includes(deal.retailer)
);
```

### 3. Price Sorting
Always shows best deals first:
```typescript
.order('price', { ascending: true })
```

### 4. Error Handling
- Validates environment variables on startup
- Catches database errors gracefully
- Logs failed email sends without crashing
- Continues processing if one user fails

### 5. Performance Optimizations
- Database indexes on frequently queried fields
- Single query to fetch all deals (with joins)
- Small delay between emails to avoid rate limiting

---

## 🐛 Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| Duplicate deals | Composite unique constraint + graceful skip |
| Empty preferred retailers | Returns all deals (user sees everything) |
| Missing retailer/product | Creates new entry automatically |
| Expired deals | Filters by `end_date >= today` |
| Invalid email format | Caught by Resend API with clear error |
| Database connection failure | Validates credentials on startup |
| Email API rate limits | 100ms delay between sends |
| Malformed JSON | Would throw clear error (add Zod for production) |


## 🚀 What I'd Build Next (2 More Days)

### Day 1: Production Infrastructure
1. **Cron Scheduling**: GitHub Actions workflow to run every Sunday at 6am
   ```yaml
   on:
     schedule:
       - cron: '0 6 * * 0'  # 6am every Sunday
   ```

2. **Analytics Dashboard**: Simple React app showing:
   - Total deals sent this week
   - Email open/click rates per retailer
   - Most popular categories
   - User engagement metrics

3. **Preference Management Page**: 
   - Web UI for users to update preferred retailers
   - Select categories (produce, protein, household)
   - Set price alert thresholds

4. **Error Monitoring**: Sentry integration
   - Track failed email sends
   - Alert on database errors
   - Monitor API rate limits

5. **Database Backups**: Automated daily backups to S3

### Day 2: Intelligence & Scale
1. **Price History Tracking**:
   - Store historical prices for trend analysis
   - "Best price in 30 days" badge
   - Price drop alerts via SMS

2. **Smart Recommendations**:
   - Track email clicks/opens
   - ML model for personalized deal ranking
   - "You might also like" section

3. **Web Scraper** (production-ready):
   - Scrape 3-5 major retailers (Ralphs, Vons, Walmart)
   - Run every 6 hours via cron
   - Parse HTML to extract deals
   - Auto-populate database

4. **Multi-Channel Delivery**:
   - SMS alerts for urgent deals
   - Push notifications via PWA
   - Slack/Discord bot integration

5. **A/B Testing**:
   - Test email subject lines
   - Test deal ordering strategies
   - Measure engagement by variant

---

## 🧪 Testing

### Manual Testing
```bash
# 1. Preview email design
npm run preview
open deals-preview.html

# 2. Test database ingestion
npm run ingest
# Verify in Supabase Table Editor

# 3. Send test emails
npm run send:weekly
# Check inbox
```

### Automated Testing (would add)
```typescript
// Unit tests for ingestion logic
describe('ingestDeals', () => {
  it('should skip duplicate deals', async () => {
    // Test duplicate handling
  });
});

// Integration tests for email generation
describe('generateEmailHTML', () => {
  it('should include all deal information', () => {
    // Test HTML output
  });
});
```

---

## 📚 Technologies Used

- **TypeScript**: Type-safe development
- **Supabase**: PostgreSQL database + API
- **Resend**: Transactional email API
- **Node.js**: Runtime environment
- **tsx**: TypeScript execution (no build step needed)

---


## 👤 Author

[Chaitra Puttabudhi]  
[chaitraputtabudhi@gmail.com]  
[GitHub Profile]

---


**Built with ❤️ for Prox**