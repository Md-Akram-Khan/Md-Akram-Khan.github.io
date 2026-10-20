# Ask the Note — AI chat Worker

The portfolio's chat works without this: it answers from the portfolio data in the
browser. This Worker upgrades it to a real AI (OpenAI's open gpt-oss models via Groq's free API) without
putting the API key in the website, where anyone could copy it.

It reads the facts from the live site's `knowledge.txt` (generated from
`src/data/portfolio.ts` on every build), so the AI stays in sync automatically.

## One-time setup (free, about 10 minutes)

1. **Groq API key** — sign up at <https://console.groq.com>, open *API Keys*, create a key and copy it.
2. **Cloudflare account** — sign up at <https://dash.cloudflare.com/sign-up> (free plan).
3. **Deploy the Worker** — in this `worker` folder:

   ```sh
   npx wrangler login                    # opens the browser once to connect Cloudflare
   npx wrangler deploy                   # prints the Worker URL, e.g. https://ask-the-note.<you>.workers.dev
   npx wrangler secret put GROQ_API_KEY  # paste the Groq key when asked
   ```

4. **Point the site at it** — in the GitHub repo *My-Portfolio* → *Settings* → *Secrets and variables* →
   *Actions* → *Variables* → **New repository variable**: name `VITE_CHAT_ENDPOINT`, value = the Worker URL.
   Then re-run the *Deploy to GitHub Pages* workflow (or push any change).

The chat header then reads "AI · answers from this portfolio". If the Worker is ever
down, over its limits or misconfigured, the chat quietly falls back to the built-in answers.

## Limits and safety

- Only `ALLOWED_ORIGINS` (and `localhost` for testing) may call it.
- 20 questions per visitor per 10 minutes; last 8 messages, 600 characters each.
- The model is told to answer only from the facts and to decline unrelated requests.
- Groq's free tier allows about 8,000 tokens per minute per model; one question uses about 2,800, so
  roughly 3 questions a minute per model. When both models are busy, the chat falls back to built-in answers.
- Visitors' questions are sent to Groq to generate answers.
