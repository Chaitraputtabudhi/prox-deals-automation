// Email template generator - Creates beautiful HTML emails with Prox branding
import { DealForEmail } from '../types/index.js';

/**
 * Generate HTML email with Prox branding
 * Features:
 * - Prox colors: #0FB872 (primary), #0A4D3C (dark), #F4FBF8 (bg)
 * - Mobile responsive
 * - Grouped by retailer
 * - Sorted by price (lowest first)
 */
export function generateEmailHTML(userName: string, deals: DealForEmail[]): string {
  // Group deals by retailer for better readability
  const dealsByRetailer = deals.reduce((acc, deal) => {
    if (!acc[deal.retailer]) {
      acc[deal.retailer] = [];
    }
    acc[deal.retailer].push(deal);
    return acc;
  }, {} as Record<string, DealForEmail[]>);

  // Generate HTML sections for each retailer
  const retailerSections = Object.entries(dealsByRetailer)
    .map(([retailer, retailerDeals]) => `
      <div style="margin-bottom: 24px; border-left: 4px solid #0FB872; padding-left: 16px;">
        <h2 style="color: #0A4D3C; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
          ${retailer}
        </h2>
        ${retailerDeals.map(deal => `
          <div style="margin-bottom: 12px; padding: 12px; background: #F4FBF8; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #1a202c; margin-bottom: 4px;">
                  ${deal.product}
                </div>
                <div style="font-size: 14px; color: #718096;">
                  ${deal.size} • Valid ${formatDate(deal.start_date)} - ${formatDate(deal.end_date)}
                </div>
              </div>
              <div style="font-size: 24px; font-weight: 700; color: #0FB872; margin-left: 16px; flex-shrink: 0;">
                $${deal.price.toFixed(2)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

  // Main email HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Deals from Prox</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Prox gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #0FB872 0%, #0A4D3C 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🎉 Prox Weekly Deals
              </h1>
              <p style="margin: 8px 0 0 0; color: #F4FBF8; font-size: 16px;">
                Your personalized deals are here!
              </p>
            </td>
          </tr>

          <!-- Personalized greeting -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0; font-size: 16px; color: #2d3748; line-height: 1.6;">
                Hi ${userName},
              </p>
              <p style="margin: 12px 0 0 0; font-size: 16px; color: #2d3748; line-height: 1.6;">
                We've found the <strong>top ${deals.length} deals</strong> at your favorite stores this week. Check them out below!
              </p>
            </td>
          </tr>

          <!-- Deals content -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              ${retailerSections}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F4FBF8; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #718096; line-height: 1.5;">
                Want to customize which stores you see deals from?
              </p>
              <a href="https://prox.com/preferences" style="display: inline-block; background-color: #0FB872; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Manage Preferences
              </a>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #a0aec0; line-height: 1.5;">
                You're receiving this because you signed up for Prox weekly deals.<br>
                <a href="https://prox.com/unsubscribe" style="color: #0FB872; text-decoration: underline;">Unsubscribe</a> | 
                <a href="https://prox.com/privacy" style="color: #0FB872; text-decoration: underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Format date for email display
 * Example: "2025-09-01" -> "Sep 1"
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}