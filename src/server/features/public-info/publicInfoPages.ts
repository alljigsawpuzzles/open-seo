const pages = {
  about: {
    title: "About AJP OpenSEO",
    description: "Information about AJP OpenSEO and its Google connections.",
    body: `
      <p class="eyebrow">Application information</p>
      <h1>AJP OpenSEO</h1>
      <p class="intro">A private reporting application operated by All Jigsaw Puzzles for its authorised team.</p>
      <h2>What the application does</h2>
      <p>AJP OpenSEO lets authorised users view website performance reports in one place. Users can connect a Google account and choose a Google Analytics or Search Console property they are permitted to access.</p>
      <h2>Why Google access is requested</h2>
      <p>Google Analytics access is used to display reports for the selected property, including traffic, engagement and conversion metrics. Search Console access is used to display search performance and indexing information for the selected site.</p>
      <p>These connections request read-only access. The application does not use these permissions to change or delete Google Analytics or Search Console data. Basic Google account information identifies the connected account.</p>
      <h2>Who can use it</h2>
      <p>The application is available to authorised All Jigsaw Puzzles users. Access to reports and account connections requires authentication. This information page and the privacy notice are available without signing in.</p>
      <p>Read our <a href="/privacy">application privacy notice</a> for information about Google data, access and deletion.</p>
      <a class="button" href="/">Open application <span aria-hidden="true">&rarr;</span></a>`,
  },
  privacy: {
    title: "AJP OpenSEO privacy notice",
    description:
      "How the AJP OpenSEO application handles Google account and reporting data.",
    body: `
      <p class="eyebrow">Application privacy</p>
      <h1>Privacy notice</h1>
      <p class="intro">How All Jigsaw Puzzles handles information in its AJP OpenSEO application.</p>
      <p class="updated">Last updated: 16 October 2026</p>
      <h2>Scope of this notice</h2>
      <p>This notice applies to the AJP-operated OpenSEO application and its Google connections. All Jigsaw Puzzles operates this installation and controls the information processed in it.</p>
      <h2>Information accessed</h2>
      <p>When you authorise a Google connection, the application receives Google account identity information, including your account identifier and email address, together with access and refresh tokens issued by Google.</p>
      <p>With your permission, the application can list the Analytics or Search Console properties available to your account and retrieve information for the property you select. Analytics information includes traffic, acquisition, engagement, conversion and ecommerce reports, and property configuration information used by reporting features. Search Console information includes queries, pages, clicks, impressions, positions and indexing information.</p>
      <h2>How information is used</h2>
      <p>We use this information to identify the connected account, retrieve the reports requested by authorised users, display connection status and website performance, and provide analysis requested through the application or a connected client. Tokens allow the application to retrieve authorised data without requiring a new Google sign-in for each request.</p>
      <p>The Analytics and Search Console integrations use read-only permissions. They do not change or delete data or settings in those services.</p>
      <h2>Access and sharing</h2>
      <p>Information is processed on Cloudflare infrastructure used to host the application. Authorised application users and administrators can access information according to their workspace and project permissions.</p>
      <p>If you request reports through a connected AI assistant or other client, the requested results are returned to that client and its provider for your requested analysis. Any provider you choose to connect processes those results under its own terms. Reports that you export or deliberately share can be accessed by the recipients you choose. Google access credentials are not included in report results.</p>
      <p>Google API data is not sold, used for advertising targeting or used to train general-purpose AI models. AJP OpenSEO's use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
      <h2>Protection of information</h2>
      <p>Connections use HTTPS, stored Google OAuth tokens are encrypted, and access to the application requires authentication. These public information pages do not display account information or reports.</p>
      <h2>Retention and deletion</h2>
      <p>Connection information and credentials are retained while needed to operate the authorised connection. Reports and other content saved in the application may remain until deleted. Disconnecting a property does not necessarily delete its underlying Google authorisation or previously saved reports.</p>
      <p>You can revoke the application's Google access at any time through your <a href="https://myaccount.google.com/connections">Google Account connections</a>. To request deletion of stored credentials, reports or other application information, contact us using the address below. Backup copies may remain until they expire through the backup retention process.</p>
      <h2>Contact</h2>
      <p>For questions about this notice, Google connections or deletion requests, email <a href="mailto:googleservices@alljigsawpuzzles.co.uk">googleservices@alljigsawpuzzles.co.uk</a>.</p>`,
  },
};

// Static documents deliberately omit the app shell, analytics and database reads.
export function publicInfoPageResponse(page: keyof typeof pages): Response {
  const content = pages[page];
  return new Response(
    `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="${content.description}">
  <title>${content.title}</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172c2a; background: #f6f8f6; }
    * { box-sizing: border-box; }
    body { margin: 0; font-size: 16px; line-height: 1.75; }
    a { color: #145e4c; text-underline-offset: .2em; }
    a:hover { color: #0c4134; }
    a:focus-visible { outline: 3px solid #b96318; outline-offset: 5px; border-radius: 2px; }
    header, main, footer { width: min(100% - 40px, 760px); margin-inline: auto; }
    header { padding: 26px 0; border-bottom: 1px solid #d9e3dc; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .brand { font-weight: 750; font-size: 18px; letter-spacing: -.035em; text-decoration: none; color: #172c2a; }
    nav { display: flex; gap: 24px; font-size: 14px; }
    nav a[aria-current="page"] { font-weight: 700; }
    main { padding-block: 56px 64px; }
    .eyebrow { color: #376d55; text-transform: uppercase; letter-spacing: .13em; font-size: 12px; font-weight: 700; margin: 0 0 14px; }
    h1 { font-size: clamp(36px, 7vw, 52px); line-height: 1.12; letter-spacing: -.045em; margin: 0 0 22px; }
    .intro { font-size: 21px; line-height: 1.55; color: #4b625a; margin: 0 0 30px; max-width: 620px; }
    h2 { font-size: 20px; line-height: 1.4; letter-spacing: -.02em; margin: 38px 0 12px; }
    p { margin: 0 0 18px; }
    .updated { color: #5f7068; font-size: 14px; }
    .button { display: inline-flex; align-items: center; gap: 24px; background: #173f32; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px; }
    .button:hover { background: #0f3025; color: white; }
    footer { border-top: 1px solid #d9e3dc; padding: 24px 0 32px; color: #5f7068; font-size: 13px; }
    @media (max-width: 480px) { header { align-items: flex-start; flex-direction: column; gap: 12px; } main { padding-top: 38px; } }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/about">AJP OpenSEO</a>
    <nav aria-label="Application information">
      <a href="/about"${page === "about" ? ' aria-current="page"' : ""}>About</a>
      <a href="/privacy"${page === "privacy" ? ' aria-current="page"' : ""}>Privacy</a>
    </nav>
  </header>
  <main>${content.body}</main>
  <footer>All Jigsaw Puzzles &middot; <a href="mailto:googleservices@alljigsawpuzzles.co.uk">Application support</a></footer>
</body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
