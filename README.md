# X Post Purger

A userscript that automatically deletes **all posts** (tweets, retweets, replies) from your X (Twitter) account **directly from your profile**, without requiring the official data archive.  
Runs fully in the browser using your authenticated session.

> ⚠️ Irreversible action. Use responsibly.  
> To stop deletion at any moment: **close the browser tab**.

---

## Features

- ✅ Deletes **all** posts from your account  
- ✅ No data archive needed  
- ✅ Simple popup UI with **Start deletion** button  
- ✅ Progress bar + live counter  
- ✅ Handles retweets via the UI  
- ✅ Automatic rate-limit handling (429 + reset timers)  
- ✅ Detects post count in **multiple languages** (Hebrew, English, Spanish, German, Italian, Turkish, Russian, etc.)  
- ✅ Runs client-side only

---

## Installation (Userscript)

1. Install a userscript manager: **Tampermonkey** / **Violentmonkey**.
2. Create a new script and paste the contents of `userscript.user.js`.
3. Enable the script on:
   - `x.com`
   - `twitter.com`
4. Refresh your profile page — a popup will appear.

---

## Usage

1. Log into X and open **your profile**.
2. A modal window will appear automatically.
3. Click **Start deletion**.
4. Keep the tab open until completion.  
   - The script scrolls, collects visible post IDs, and deletes them via the X API.  
   - Retweets are unretweeted using the UI button.  
5. **To stop deletion**, simply close the tab.  
   - Closing the tab immediately halts the loop and no more deletion requests are sent.

---

## Running from the Browser Console (Alternative Method)

If you prefer not to install a userscript manager, you can run the script directly:

1. Open your profile on X.
2. Press `F12` to open **DevTools**.
3. Go to the **Console** tab.
4. Paste the full contents of `userscript.user.js` into the console.
5. Press **Enter**.

The same popup UI will appear, and you can click **Start deletion**.

---

## How it Works

- Scrapes visible posts using selectors like:  
  `a[href*="/status/"]` inside `[data-testid="tweet"]`
- Sends authenticated DeleteTweet GraphQL requests using your session cookies:
  - `authorization`
  - `ct0` (CSRF)
  - `OAuth2Session`
- Respects rate limits and pauses when necessary.
- Removes deleted posts from the DOM to minimize repeats.

---

## Notes & Limitations

- Large profiles (100k+ posts) require long runtimes due to X's infinite scroll.
- X may occasionally return 404/500 errors for old media URLs — harmless.
- If X changes DOM structure, selectors may need updating.
- Retweets require UI interaction since their API differs.

---

## Troubleshooting

### Modal does not appear
- Refresh the page  
- Ensure the script is enabled  
- Make sure you're on **your profile**, not someone else’s

### Deletion seems slow
- X’s rate limits vary; the script automatically slows down to stay within safe bounds.

### I want to stop the deletion
- **Close the browser tab**  
---

## Security

- All operations run locally in your browser.  
- No data is uploaded anywhere.  

---

## License

MIT
