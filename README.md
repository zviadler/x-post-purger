# X Post Purger (no archive)

Delete your X (Twitter) posts directly from your profile **without** downloading the data archive.  
Works by scraping visible tweet IDs from the DOM and calling the official DeleteTweet GraphQL endpoint, with rate-limit backoff and live progress.

> ⚠️ Use at your own risk. This action is irreversible and may violate X’s terms of service. You are responsible for your account.

---

## Features

- ✅ No archive export required  
- ✅ One-click modal UI: **Start deletion**  
- ✅ Live counter + progress bar  
- ✅ Retweets handled via UI “Unretweet”  
- ✅ Basic rate-limit backoff (429 / reset headers)  
- ✅ Multilingual “posts” count detection (Hebrew/EN/ES/DE/TR/IT/RU, etc.)

---

## Install

1. Install a userscript manager: **Tampermonkey** (Chrome/Edge/Brave/Firefox) or **Violentmonkey**.
2. Create a new userscript and paste the contents of [`userscript.user.js`](./userscript.user.js).  
   *(Or host the file and “Install from URL”.)*
3. Disable other X deletion scripts to avoid UI conflicts.

---

## Usage

1. Log into your X account and open your profile.
2. A modal appears automatically.
3. Click **Start deletion**.  
   - The script will:
     - Switch to **Tweets & replies** tab (if present).
     - Collect visible tweet IDs from the timeline.
     - Delete in small batches with short delays (and backoff if rate-limited).
4. Keep the tab open. Refresh to verify progress if needed.

---

## How it works

- Collects tweet IDs from links like:  
  `a[href*="/status/1234567890"]` inside `[data-testid="tweet"]`
- Calls X’s DeleteTweet GraphQL endpoint with your session cookies (`ct0`, OAuth2Session).
- When rate-limited, waits until `x-rate-limit-reset` or performs a short cooldown.
- Removes deleted tweets from the DOM to reduce duplicates.

---

## Known limits / Notes

- Heavy media timelines may spam network errors (404/500) from `video.twimg.com` — harmless and unrelated to deletion.
- Extremely old posts may be slower to surface due to X’s infinite scroll.
- Retweets: deleted via UI “Unretweet” (different API).
- X can change DOM/endpoint details at any time.

---

## Troubleshooting

- **Modal didn’t show?** Refresh the page; ensure the userscript is enabled and running on `x.com` domains.
- **TypeError with `.remove()`?** The script guards most DOM removals; make sure you’re on your profile page.
- **Rate limit loops?** Increase the per-item delay in the script from `240ms` to `300–350ms`.

---

## Security & Privacy

- Runs locally in your browser; no data leaves your machine.
- Uses your existing X session (cookies). Do not share recordings/logs with tokens.

---

## Development

- File: `userscript.user.js`
- Main object: `TweetDeleter`
- Key methods:
  - `ensureOnProfileAndTweetCount()`
  - `sendDeleteRequest(tweetId)`
  - `slowDelete()` loop
- PRs welcome for:
  - Additional language cues for “posts”
  - Better DOM selectors / resilience
  - Pause/Resume button

---

## License

MIT
