XTREME MARKETING v2.0 - MARKETING COMMAND CENTRE
================================================

WHAT'S INSIDE
- Design studio: posts (1080x1350), squares, stories, A5 and A4 print flyers in the
  Xtreme black-and-gold style. Five layouts: Spotlight, Offer card, Before & after,
  Tips, Occasion. Upload photos or pick Pexels stock photos, auto-enhance, price
  badge from your price list, Arabic line, WhatsApp / campaign / review QR codes.
  Saved designs are shared with the whole team. Download PNG, print PDF, or share.
- Content planner: monthly calendar with UAE occasions (National Day, Flag Day,
  Ramadan, Eid, White Friday, moving season...). "Plan my month" fills a balanced
  posting rhythm in one tap. Every post has channels, status, owner, caption, design.
- Leads: every enquiry from first message to won job. Stages, follow-up dates,
  overdue alerts, one-tap WhatsApp replies, duplicate-number warning, review request
  when a job is won, CSV export, "Quote in Xtreme" button.
- Campaigns & QR: each flyer drop, ad or partner gets a tracked QR code and link.
  Every scan is counted, WhatsApp opens with "(Ref: CODE)", and leads tagged with
  the code show cost per lead and return.
- Writer: captions (English / Arabic / both) for each channel, WhatsApp message
  templates, hashtag builder, Instagram / Google Business / LinkedIn profile text,
  and the Google business (schema) code for your website.
- SEO radar: live scan of every page on www.xtreme-fmgroup.com with a score and fix
  list, Google's own speed test, Google Search Console clicks / impressions / ranking,
  "close to page 1" searches, and keyword watch.
- Team: admin plus up to 10 people, choose which sections each person opens,
  block / unblock. The server enforces the access, not just the screen.

It replaces the old Marketing Hub on the SAME Netlify site
(xtrememarketinghub.netlify.app), so the address and the Android app stay the same.
assetlinks.json is the Marketing Hub one (package app.netlify.xtrememarketinghub.twa).


STEP 1 - PUT THE FILES ON GITHUB (from your phone, about 10 minutes)
 Tip: in Chrome tap the 3 dots > tick "Desktop site" so GitHub shows every button.
 1. Unzip on the phone (Files app > tap the zip > Extract). You get a folder
    "xtreme-marketing" with: netlify, public, netlify.toml, package.json, README.txt
 2. github.com > "+" > New repository > name: xtreme-marketing > Private > Create.
 3. On the empty repository page tap "uploading an existing file".
    Upload netlify.toml, package.json, README.txt > Commit changes.
 4. Make the "public" folder: Add file > Create new file > type the name
       public/.keep
    (the "/" makes the folder) > Commit changes.
    Open the new "public" folder > Add file > Upload files > choose ALL 8 files from
    xtreme-marketing/public on your phone:
       index.html  sw.js  manifest.webmanifest  assetlinks.json
       icon-192.png  icon-512.png  _headers  _redirects
    > Commit changes.
 5. Make the server folder the same way: go back to the main page > Add file >
    Create new file > name:  netlify/functions/.keep > Commit changes.
    Open netlify > functions > Add file > Upload files > choose api.mjs > Commit.
 6. Check the repository shows:
       netlify/functions/api.mjs
       public/ (8 files + .keep)
       netlify.toml  package.json  README.txt

STEP 2 - CONNECT GITHUB TO YOUR MARKETING HUB SITE ON NETLIFY
 1. app.netlify.com > your Marketing Hub site (xtrememarketinghub) >
    Site configuration > Build & deploy > Continuous deployment > Link repository >
    GitHub > xtreme-marketing.
 2. Build command: leave empty. Publish directory: public.
    Functions directory: netlify/functions. Deploy.
 3. Wait for the green "Published". Then check in Chrome:
       https://xtrememarketinghub.netlify.app/api/ping
    must show {"ok":true,"server":true,"app":"xtreme-marketing","version":"2.0"}
 4. Close the app fully and open it again. You'll see the radar start-up screen.
 Never drag this folder into Netlify: drag-and-drop can't run the server part.

STEP 3 - SIGN IN AND ADD THE TEAM
 First sign-in: username admin, password admin. You are asked to choose your own
 username and password straight away.
 Settings (gear) > Team and access > add each person, tick the sections they may
 open. They choose their own password at first sign-in.

STEP 4 - CONNECTIONS (Settings > Connections, admin only)
 - Pexels key: the same key you used in the old hub (pexels.com/api). Tap Test Pexels.
 - Claude API key (optional): console.anthropic.com > API keys. Without it, writing
   is still free (Quick write, or "Use my Claude app").
 - Google review link: Google Business Profile > "Ask for reviews" > copy the link.
 - Xtreme app address: https://xtremesalestoolkit.netlify.app (already filled).
 Tap Save connections.

STEP 5 - GOOGLE SEARCH CONSOLE FOR SEO RADAR (once, easiest on a computer, 10 min)
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
 SEO radar now shows Google data. Google updates it once a day (about 2 days behind).
 Optional: in the same Google Cloud project, enable "PageSpeed Insights API",
 create an API key (APIs & Services > Credentials) and paste it into
 "Google PageSpeed key" if the speed test ever says the quota is used up.

ANDROID APP (ADDRESS BAR)
 After deploying, open https://xtrememarketinghub.netlify.app/.well-known/assetlinks.json
 It must show the JSON text. If the address bar shows in the app, uninstall and
 reinstall the Marketing Hub APK once.

GOOD TO KNOW
 - Leads, the content plan, campaigns, designs and keywords are stored on the
   Netlify server and shared by the whole team. The old Marketing Hub kept data on
   each phone; that data is not moved automatically.
 - QR codes point to https://xtrememarketinghub.netlify.app/go/CODE. You can change
   where a campaign goes later without reprinting.
 - Moon-sighting dates (Ramadan, Eid) are marked "expected" and may shift a day.
 - Check any price on a design before publishing. Prices come from the Xtreme price list.
