// ==UserScript==
// @name         X Tweet Auto Deleter (no archive) EN
// @namespace    https://github.com/custom/tweet-auto-deleter/
// @version      1.1.0
// @description  Delete all your tweets from your profile without using the data archive file.
// @author       You
// @match        https://x.com/*
// @match        https://mobile.x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @icon         https://www.google.com/s2/favicons?domain=twitter.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TweetDeleter = {
        version: '1.1.0',
        baseUrl: '',
        deleteURL: '/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet',
        authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        ct0: null,
        transaction_id: '',
        username: '',
        TweetCount: 0,
        dCount: 0,
        total: 0,
        isRunning: false,

        async init() {
            this.baseUrl = `https://${window.location.hostname}`;
            this.ct0 = this.getCookie('ct0');
            this.updateTransactionId();

            if (!this.ct0) {
                console.warn('TweetDeleter: cookie "ct0" not found – make sure you are logged in to X.');
            }

            await this.ensureOnProfileAndTweetCount();
            this.total = this.TweetCount || 0;

            this.createUI();
            this.updateInfo(`Found approximately ${this.TweetCount.toLocaleString()} posts on your profile. Click "Start deletion" to begin.`);
            this.updateProgress();
        },

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        getCookie(name) {
            const match = `; ${document.cookie}`.match(`;\\s*${name}=([^;]+)`);
            return match ? match[1] : null;
        },

        updateTransactionId() {
            // random string – same style as TweetXer
            this.transaction_id = [...crypto.getRandomValues(new Uint8Array(95))]
                .map((x, i) => (i = x / 255 * 61 | 0, String.fromCharCode(i + (i > 9 ? i > 35 ? 61 : 55 : 48)))).join``;
        },

        async ensureOnProfileAndTweetCount() {
            await waitForElemToExist('header');
            await this.sleep(1000);

            // Navigate to profile if we are not already there
            if (!document.querySelector('[data-testid="UserName"]')) {
                if (document.querySelector('[aria-label="Back"]')) {
                    document.querySelector('[aria-label="Back"]').click();
                    await this.sleep(1000);
                } else if (document.querySelector('[data-testid="app-bar-back"]')) {
                    document.querySelector('[data-testid="app-bar-back"]').click();
                    await this.sleep(1000);
                }

                if (document.querySelector('[data-testid="AppTabBar_Profile_Link"]')) {
                    document.querySelector('[data-testid="AppTabBar_Profile_Link"]').click();
                } else if (document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]')) {
                    document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]').click();
                    await this.sleep(1000);
                    const icon = document.querySelector('[data-testid="icon"]');
                    if (icon && icon.nextElementSibling) icon.nextElementSibling.click();
                }

                await waitForElemToExist('[data-testid="UserName"]');
            }

            await this.sleep(1000);

            // Helper to parse things like "1,234", "1.2K", "1,2K"
            const parseNumberLike = (str) => {
                let s = (str || '').trim();
                if (!s) return null;

                // 1.2K / 1,2K / 1.2k
                const kMatch = s.match(/^([\d.,]+)[Kk]$/);
                if (kMatch) {
                    const num = parseFloat(kMatch[1].replace(',', '.'));
                    if (isNaN(num)) return null;
                    return Math.round(num * 1000);
                }

                // Standard number with separators
                const cleaned = s.replace(/[.,\s]/g, '');
                const n = parseInt(cleaned, 10);
                return Number.isFinite(n) ? n : null;
            };

            // Try to detect "posts" count in any language:
            const extractPostCountGeneric = () => {
                const postsKeywords = [
                    'post', 'posts', 'tweet', 'tweets',
                    'פוסט', 'פוסטים',          // Hebrew
                    'poste', 'postes',          // FR
                    'publicación', 'publicaciones', 'publicacao', 'publicações', 'publicaciones', // ES/PT
                    'beitrag', 'beiträge',      // DE
                    'gönderi', 'gönderiler',    // TR
                    'pubblicazioni',            // IT
                    'публикации', 'публикаций', 'постов', 'посты', // RU
                    'mensajes'                  // misc
                ].map(w => w.toLowerCase());

                const candidates = [];
                const elems = document.querySelectorAll('div[dir="ltr"]');

                for (const el of elems) {
                    const text = (el.textContent || '').trim();
                    if (!/\d/.test(text)) continue;

                    const m = text.match(/^([\d.,Kk]+)\s+(.+)$/u);
                    if (!m) continue;

                    const numPart = m[1];
                    const label = m[2].toLowerCase();

                    const value = parseNumberLike(numPart);
                    if (!value) continue;

                    let score = 0;
                    if (postsKeywords.some(k => label.includes(k))) score += 10;
                    if (label.includes('post')) score += 5;

                    // Prefer items near the profile header (higher up on the page)
                    const rect = el.getBoundingClientRect();
                    if (rect.top < 600) score += 2;

                    candidates.push({ value, score });
                }

                if (candidates.length === 0) return null;
                candidates.sort((a, b) => b.score - a.score);
                return candidates[0].value;
            };

            try {
                this.TweetCount = extractPostCountGeneric();
                if (!this.TweetCount) {
                    console.log("TweetDeleter: could not reliably detect posts count – falling back to 1,000,000.");
                    this.TweetCount = 1000000;
                }
            } catch (e) {
                console.log("TweetDeleter: error while detecting posts count – falling back to 1,000,000.", e);
                this.TweetCount = 1000000;
            }

            this.username = document.location.href.split('/')[3]?.replace('#', '') || '';
            console.log(`TweetDeleter: detected approximately ${this.TweetCount} posts.`);
        },

        // ---------- UI ----------

        createUI() {
            if (document.getElementById('tx-backdrop')) return;

            const backdrop = document.createElement('div');
            backdrop.id = 'tx-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.45);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            `;

            const modal = document.createElement('div');
            modal.id = 'tx-modal';
            modal.style.cssText = `
                background: #15202b;
                color: #fff;
                padding: 16px 18px;
                border-radius: 10px;
                width: 360px;
                max-width: 95%;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                direction: ltr;
                text-align: left;
            `;

            modal.innerHTML = `
                <h2 id="tx-title" style="margin:0 0 8px;font-size:18px;">Tweet Deletion</h2>
                <p id="tx-info" style="margin:0 0 12px;font-size:14px;line-height:1.4;">
                    Loading profile information...
                </p>
                <div style="margin-bottom:8px;">
                    <progress id="tx-progress" value="0" max="1" style="width:100%;height:12px;"></progress>
                </div>
                <div id="tx-counter" style="font-size:13px;margin-bottom:14px;">
                    0 tweets deleted.
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-start;">
                    <button id="tx-start-btn" style="
                        padding:6px 12px;
                        border-radius:999px;
                        border:none;
                        background:#f4212e;
                        color:#fff;
                        font-weight:600;
                        cursor:pointer;
                    ">Start deletion</button>
                    <button id="tx-close-btn" style="
                        padding:6px 12px;
                        border-radius:999px;
                        border:1px solid #6e767d;
                        background:transparent;
                        color:#e7e9ea;
                        font-weight:500;
                        cursor:pointer;
                    ">Close</button>
                </div>
                <div style="margin-top:10px;font-size:11px;color:#8899a6;">
                    This action cannot be undone. Keep this tab open while deletion is running.
                </div>
            `;

            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);

            document.getElementById('tx-start-btn').addEventListener('click', () => this.slowDelete());
            document.getElementById('tx-close-btn').addEventListener('click', () => {
                backdrop.remove();
            });
        },

        updateTitle(text) {
            const el = document.getElementById('tx-title');
            if (el) el.textContent = text;
        },

        updateInfo(text) {
            const el = document.getElementById('tx-info');
            if (el) el.textContent = text;
        },

        updateProgress() {
            const bar = document.getElementById('tx-progress');
            if (bar) {
                bar.max = this.total || 1;
                bar.value = this.dCount;
            }
            const c = document.getElementById('tx-counter');
            if (c) {
                c.textContent = `${this.dCount.toLocaleString()} tweets deleted (out of ~${this.total.toLocaleString()}).`;
            }
        },

        // ---------- API CALL ----------

        async sendDeleteRequest(tweetId) {
            const url = this.baseUrl + this.deleteURL;
            const body = JSON.stringify({
                variables: {
                    tweet_id: tweetId,
                    dark_request: false
                },
                queryId: this.deleteURL.split('/')[6]
            });

            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await fetch(url, {
                        headers: {
                            'authorization': this.authorization,
                            'content-type': 'application/json',
                            'x-client-transaction-id': this.transaction_id,
                            'x-csrf-token': this.ct0,
                            'x-twitter-active-user': 'yes',
                            'x-twitter-auth-type': 'OAuth2Session'
                        },
                        referrer: `${this.baseUrl}/${this.username}/with_replies`,
                        referrerPolicy: 'strict-origin-when-cross-origin',
                        body,
                        method: 'POST',
                        mode: 'cors',
                        credentials: 'include',
                        signal: AbortSignal.timeout(5000)
                    });

                    if (response.status === 200) {
                        this.dCount++;
                        this.updateProgress();

                        const remaining = response.headers.get('x-rate-limit-remaining');
                        if (remaining !== null && Number(remaining) < 1) {
                            console.log('TweetDeleter: rate limit hit, waiting until reset...');
                            const reset = Number(response.headers.get('x-rate-limit-reset') || '0');
                            let sleepSec = Math.max(5, reset - Math.floor(Date.now() / 1000));
                            while (sleepSec > 0) {
                                this.updateInfo(`Rate limited. Resuming in ${sleepSec}s... ${this.dCount.toLocaleString()} tweets deleted so far.`);
                                await this.sleep(1000);
                                sleepSec--;
                            }
                        }

                        return true;
                    } else if (response.status === 429) {
                        console.log('TweetDeleter: 429 – waiting 60s and retrying...');
                        let sleepSec = 60;
                        while (sleepSec > 0) {
                            this.updateInfo(`Rate limited (429). Retrying in ${sleepSec}s... ${this.dCount.toLocaleString()} tweets deleted so far.`);
                            await this.sleep(1000);
                            sleepSec--;
                        }
                    } else {
                        console.log('TweetDeleter: DeleteTweet failed, status:', response.status);
                        return false;
                    }
                } catch (e) {
                    console.log('TweetDeleter: error during delete request', e);
                    await this.sleep(5000);
                }
            }

            return false;
        },

        // ---------- Deletion logic ----------

        async slowDelete() {
            if (this.isRunning) return;
            this.isRunning = true;

            const startBtn = document.getElementById('tx-start-btn');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = 'Running...';
            }

            this.updateTitle('Tweet deletion – running');
            this.updateInfo('Starting automatic deletion of tweets. Do not close this tab.');

            // Switch to "Tweets & replies" tab if available
            const tabs = document.querySelectorAll('[data-testid="ScrollSnap-List"] a');
            if (tabs[1]) {
                tabs[1].click();
                await this.sleep(1200);
            }

            // Collect visible tweet IDs
            const collectVisibleTweetIds = (max = 120) => {
                const seen = new Set();
                const ids = [];
                document.querySelectorAll('[data-testid="tweet"] a[href*="/status/"]').forEach(a => {
                    if (ids.length >= max) return;
                    const href = a.getAttribute('href') || '';
                    const m = href.match(/\/status\/(\d+)/);
                    if (m && !seen.has(m[1])) {
                        seen.add(m[1]);
                        ids.push(m[1]);
                        a.setAttribute('data-tx-picked', '1');
                    }
                });
                return ids;
            };

            // Delete a batch of IDs via API
            const runDeleteQueue = async (ids, perItemDelayMs = 240) => {
                for (const id of ids) {
                    await this.sendDeleteRequest(id);
                    await this.sleep(perItemDelayMs);

                    const link = document.querySelector(`[data-testid="tweet"] a[href$="/status/${id}"]`);
                    if (link) {
                        const tweetEl = link.closest('[data-testid="tweet"]');
                        if (tweetEl) tweetEl.remove();
                    }
                }
            };

            let emptyRuns = 0;

            while (emptyRuns < 5) {
                // Quick handling of retweets via UI (unretweet button)
                const unretweet = document.querySelector('[data-testid="unretweet"]');
                if (unretweet) {
                    unretweet.click();
                    const confirmURT = await waitForElemToExist('[data-testid="unretweetConfirm"]');
                    if (confirmURT) confirmURT.click();
                    this.dCount++;
                    this.updateProgress();
                    if (this.dCount % 100 === 0) {
                        console.log(`${new Date().toUTCString()} Deleted ${this.dCount} tweets/retweets`);
                    }
                    await this.sleep(150);
                    continue;
                }

                let ids = collectVisibleTweetIds(120);

                if (ids.length === 0) {
                    window.scrollTo(0, document.body.scrollHeight);
                    await this.sleep(800);
                    ids = collectVisibleTweetIds(120);

                    if (ids.length === 0) {
                        emptyRuns++;
                        await this.sleep(600);
                        continue;
                    } else {
                        emptyRuns = 0;
                    }
                } else {
                    emptyRuns = 0;
                }

                await runDeleteQueue(ids, 240);

                if (this.dCount % 100 === 0) {
                    console.log(`${new Date().toUTCString()} Deleted ${this.dCount} tweets`);
                }

                window.scrollTo(0, document.body.scrollHeight);
                await this.sleep(700);
            }

            this.updateTitle('Tweet deletion – finished / paused');
            this.updateInfo('Deletion loop finished (or no more tweets could be loaded right now). Refresh your profile to check.');

            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Start deletion again';
            }

            this.isRunning = false;
        }
    };

    const waitForElemToExist = async (selector) => {
        const elem = document.querySelector(selector);
        if (elem) return elem;

        return new Promise(resolve => {
            const observer = new MutationObserver(() => {
                const elem = document.querySelector(selector);
                if (elem) {
                    resolve(elem);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                subtree: true,
                childList: true,
            });
        });
    };

    TweetDeleter.init().catch(e => console.error('TweetDeleter init error', e));

})();
