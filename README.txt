XTREME MARKETING v3.0 - MARKETING COMMAND CENTRE
================================================
Everything runs on free services. No paid API keys.

WHAT'S NEW IN 3.0
- New look: the Xtreme "Black & Gold" design system (public/xds.css, DESIGN_SYSTEM.md).
  Cleaner screens, desktop layout with a side menu, fixes for small phones.
- Website visitors (free, your own): one line on your website counts visitors, where they
  came from (Google, Instagram, QR…), which pages they read, and every WhatsApp / call /
  email click. No Google Analytics, no cookies, no personal data.
- Website quote form + WhatsApp button: the same line adds a floating WhatsApp button and a
  "Free quote" form. Requests go straight into Leads with source "Website".
- Grow section:
    Growth score out of 100 with the next best actions (also on the home screen).
    Free listings checklist: Google Business, Bing, Apple Maps, 2GIS, Yellow Pages UAE…
    Reviews: log your Google rating, see who to ask, review QR code, reply templates.
    Landing pages: page text + Google FAQ code for every service and area
    ("Deep cleaning in Al Reem Island"), with prices from the price list.
    Monthly report you can print or save as PDF.
- Website & SEO now has tabs: Visitors, Health (site scan + Google speed test), Google
  (Search Console), Keywords (keyword watch + free keyword ideas from Google) and
  Rivals (compare your homepage with up to 5 competitors).
- Removed: the optional paid Claude API key. Writing is still free: Quick write, or
  "Use my Claude app" with your own free claude.ai account. An old saved key is deleted
  the next time an admin saves Settings › Connections.

EVERYTHING FROM 2.0 IS STILL HERE
Design studio, content planner with UAE occasions, leads with WhatsApp replies, tracked
QR campaigns, writer (captions, WhatsApp templates, hashtags, profile text, schema),
team accounts with per-section access. Your saved data stays as it is.


STEP 1 - UPDATE THE FILES ON GITHUB (from your phone)
 Tip: in Chrome tap the 3 dots > tick "Desktop site" so GitHub shows every button.
 Open your repository (Xtreme-marketing-updated). Upload these, replacing the old ones:
   Main page:      package.json  README.txt  DESIGN_SYSTEM.md  design-tokens.json
   public folder:  index.html  xds.css (new)  x.js (new)  sw.js  _headers
                   (keep manifest.webmanifest, assetlinks.json, icons, _redirects)
   netlify/functions folder:  api.mjs
   test folder (optional, only for developers): everything in test/
 Commit changes. Netlify publishes automatically in about a minute.
 Check: https://xtrememarketinghub.netlify.app/api/ping must show "version":"3.0".

STEP 2 - OPEN THE APP
 Close the app fully and open it again (the new version replaces the old one offline too).
 Anyone who could open SEO before can now also open Grow. Change it in
 Settings › Team and access.

STEP 3 - PUT THE SNIPPET ON YOUR WEBSITE (5 minutes, most important new step)
 1. App > Website > Visitors > "Install the website snippet" > Copy snippet.
    It looks like:
    <script async src="https://xtrememarketinghub.netlify.app/x.js" data-wa="971503641714" data-quote="1"></script>
 2. Zoho Sites > your site > Settings > Header code (custom code for all pages) > paste > Save.
 3. Publish the site.
 4. Open www.xtreme-fmgroup.com on your phone. Within a minute the visit appears in
    Website > Visitors, and the home screen score goes up.
 Only want counting, no buttons? Remove  data-wa="…"  and  data-quote="1".
 The app only accepts visits and quote requests from the website saved in
 Settings › Connections, so check that address is right.

STEP 4 - GROW: 20 MINUTES THAT PAY OFF
 - Grow > Listings: copy "Your details" and list the business on each free directory.
   Tap the status as you go (Not started > Submitted > Live).
 - Grow > Reviews: log today's Google rating and review count. Add your Google review
   link in Settings > Connections to get the review QR code.
 - Grow > Pages: build a page for your top service in your top area, paste the text and
   the Google code into a new Zoho page, publish, then tap Draft to mark it Published.
 - Grow > Score: set your monthly goals (admin).
 - Website > Rivals: add up to 5 competitor websites and tap Compare now.

STEP 5 - CONNECTIONS (Settings > Connections, admin only)
 - Pexels key (free, pexels.com/api) for stock photos in the Design studio.
 - Google review link: Google Business Profile > "Ask for reviews" > copy the link.
 - Xtreme app address: https://xtremesalestoolkit.netlify.app (already filled).
 - Google PageSpeed key: optional and free, only if the speed test says the quota is used.

STEP 6 - GOOGLE SEARCH CONSOLE (OPTIONAL, FREE) (once, easiest on a computer, 10 min)
 The website scan and speed test work straight away. For Google clicks, rankings
 and searches:
 1. console.cloud.google.com > create a project "Xtreme Marketing".
 2. APIs & Services > Library > search "Google Search Console API" > Enable.
 3. IAM & Admin > Service Accounts > Create service account > name "xtreme-seo" >
    Create and continue > Done (no roles needed).
 4. Open "xtreme-seo" > Keys > Add key > Create new key > JSON > Create.
    A .json file downloads. Keep it private.
 5. search.google.com/search-console > your website > Settings >
    Users and permissions > Add user > paste the service account email
    (xtreme-seo@....iam.gserviceaccount.com) > Permission: Restricted > Add.
    (Your website must already be verified in Search Console.)
 6. App > Settings > Connections > Google Search Console > Upload key file (.json)
    > Find > choose your website > Use this website.
 Website › Google now shows Google data. Google updates it once a day (about 2 days behind).
 Optional: in the same Google Cloud project, enable "PageSpeed Insights API",
 create an API key (APIs & Services > Credentials) and paste it into
 "Google PageSpeed key" if the speed test ever says the quota is used up.

ANDROID APP (ADDRESS BAR)
 After deploying, open https://xtrememarketinghub.netlify.app/.well-known/assetlinks.json
 It must show the JSON text. If the address bar shows in the app, uninstall and
 reinstall the Marketing Hub APK once.

GOOD TO KNOW
 - Leads, content plan, campaigns, designs, keywords, listings, reviews, landing pages and
   website visitor totals are stored on the Netlify server and shared by the team.
 - Visitor numbers are daily totals only. The app never stores IP addresses, names or
   cookies from website visitors. Search bots and speed-test robots are ignored.
 - The quote form ignores robots (a hidden trap field and a speed check) and accepts at
   most 5 requests per phone connection per day. If the same number is already an open
   lead, the request is added to that lead's history instead of creating a duplicate.
 - QR codes point to https://xtrememarketinghub.netlify.app/go/CODE. You can change where
   a campaign goes later without reprinting.
 - Moon-sighting dates (Ramadan, Eid) are marked "expected" and may shift a day.
 - Check any price on a design or landing page before publishing. Prices come from the
   Xtreme price list.

FOR DEVELOPERS
 npm run dev   runs the app locally with in-memory storage (http://127.0.0.1:8888).
 npm test      end-to-end test (needs Playwright + Chromium).
