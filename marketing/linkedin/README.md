# UAEITJOBS on LinkedIn: page design + a post every day

Page: <https://www.linkedin.com/company/uaeitjobs/>

Nothing in this folder uses LinkedIn credentials or tokens. The generator only **reads** the public job API and
**writes** files. Posting is done by a connector you authorise yourself (Part 3), or by hand.

```
marketing/linkedin/
  assets/            cover-4200x700.png · logo-400.png · launch-card.png   (upload these)
  content/           tips.json (21) · questions.json (8)   evergreen content, edit freely
  daily_post.mjs     builds today's post + image from live data
  build_assets.mjs   re-creates the assets above
  out/               generated posts (not committed)
.github/workflows/linkedin-daily-post.yml   runs the generator every morning
```

---

## Part 1: Design the page (about 30 minutes, once)

LinkedIn renames menus now and then; look for the closest option.

| Where (Page admin view → Edit page) | What to put | Why |
|---|---|---|
| **Logo** | `assets/logo-400.png`, or better your original high-resolution logo | The files in `/public` are small, so an original looks sharper |
| **Cover** | `assets/cover-4200x700.png` | Centre-weighted: LinkedIn covers the lower left with the logo on desktop and crops the sides on mobile. LinkedIn's quoted cover size has changed over time (older 1128×191, newer sources ~6:1), so check the size shown in the editor; this one is built to survive both |
| **Tagline** (max 120 characters) | `UAE IT jobs in one place: software, cloud, data & security roles across Dubai, Abu Dhabi, Sharjah and remote.` | Keywords people actually search |
| **About** | see below | The first ~150 characters are what Google shows |
| **Website** | `https://www.uaeitjobs.com` | Also link back from the site (already done in the footer) |
| **Custom button** | *Visit website* → `https://www.uaeitjobs.com/jobs?utm_source=linkedin&utm_medium=page&utm_campaign=cta_button` | The tag lets you see button clicks in your analytics |
| **Industry / size / location** | Technology, Information and Internet · 2-10 · Dubai (or your base) | Complete pages rank higher in LinkedIn search |
| **Hashtags** (up to 3) | `#UAEJobs` `#ITJobs` `#TechJobs` | People follow hashtags |
| **Specialties** | UAE jobs, IT jobs, tech recruitment, software engineering jobs, DevOps jobs, data engineering jobs, cybersecurity jobs, remote jobs, Dubai jobs, Abu Dhabi jobs | Search keywords |

### About text (paste, then adjust)

> UAE IT jobs from leading job boards and employers, in one searchable list. UAEITJOBS gathers software, cloud,
> DevOps, data, cybersecurity, QA and product roles across Dubai, Abu Dhabi, Sharjah and remote-UAE, with full
> descriptions and direct apply links.
>
> What you'll find
> • Thousands of open roles, refreshed daily
> • Filters for emirate, stack, job type and posting date
> • A directory of UAE hiring companies with links to their careers pages
> • Remote roles tagged UAE-friendly
>
> Job seekers: free to use. Save roles, track your applications and apply on the source site.
> Employers: post a role, or import one from a LinkedIn URL.
>
> Follow this page for fresh roles, hiring insights and career tips for the UAE tech community.
> uaeitjobs.com

Only keep claims you can stand behind on the day you publish.

### Launch checklist

1. Publish the launch post with `assets/launch-card.png` (text suggestions in `/linkedin_growth_kit.md`).
2. **Pin it** to the top of the page (⋯ menu on the post → pin).
3. Run the page's **invite connections** tool and invite the people who would care (LinkedIn limits how many per month).
4. Ask your team and friends to set the page as their employer, and to like, comment on and reshare the launch post **in the first hour**.
5. Add `Follow us` + the page link to your email signature and personal profile.
6. Put the first comment on every post (the generator writes it for you) so the link is not in the post body.
7. Paste a job link into LinkedIn's **Post Inspector** once, to refresh the preview card.

### Habits that grow a page (without gaming it)

- Reply to every comment within the first hour, as the page. Early conversation is what LinkedIn rewards.
- 3 to 5 hashtags per post (the generator uses 3 to 5).
- Post at the same time each day; try 8 to 10 am UAE time on Tue to Thu and check **Analytics** after two weeks.
- Rotate formats (the generator does): hiring roundup, skills in demand, remote roles, role spotlight, tip, weekend
  roundup, question.
- Look at Analytics weekly (impressions, click-through, followers) and do more of what works.
- Don't use engagement pods, bought followers, or tools that auto-like, auto-comment or auto-invite. They break
  LinkedIn's rules and can get the page restricted.

---

## Part 2: What gets posted each day

Weekday (UAE time) decides the format. Every number comes from the live API at generation time.

| Day | Post | Falls back to a tip if... |
|---|---|---|
| Sun | A discussion question | never |
| Mon | "N new tech roles", top hiring companies, split by emirate | fewer than 8 fresh IT roles |
| Tue | Most requested skills across recent listings | too few recent full descriptions |
| Wed | Remote roles tagged UAE-friendly, with 3 examples | fewer than 3 usable examples |
| Thu | Five roles to look at, links in the first comment | fewer than 5 usable roles |
| Fri | Career tip | never |
| Sat | Weekend roundup of fresh roles | fewer than 5 usable roles |

Filters: IT-relevant titles only, no test companies, and only roles with a real description (not a one-line summary).

```bash
node marketing/linkedin/daily_post.mjs                       # today -> out/<date>/ and out/latest/
node marketing/linkedin/daily_post.mjs --type tip --no-image # force a type, text only
node marketing/linkedin/daily_post.mjs --plan 14             # 14 evergreen drafts -> out/plan.md + plan.csv
node marketing/linkedin/build_assets.mjs                     # rebuild the page graphics
```

Needs Node 22+ and `npm ci` (the image renderer uses Playwright, already a dev dependency).

---

## Part 3: Automate the posting (pick one)

### A. By hand with LinkedIn's own scheduler (no setup)

Run `--plan 14`, open `out/plan.md`, and in the page's post box use **Schedule for later** (LinkedIn lets page admins
schedule posts several weeks ahead). About 30 seconds per post. These drafts are evergreen on purpose: a
"new roles today" post scheduled two weeks early would be untrue.

### B. Fully automatic with a connector (recommended)

**1. Turn on the feed (GitHub).** Merge the branch containing `.github/workflows/linkedin-daily-post.yml`, then
*Actions → LinkedIn daily post feed → Run workflow* once. It creates the `social-feed` branch holding
`post.json` and `card.png`, and refreshes them at 08:00 UAE time every day. (GitHub pauses scheduled workflows on
a repository with no activity for 60 days. If posts stop, re-enable the workflow.)

**2. Connect LinkedIn in Make.com** (or Zapier / Buffer / Hootsuite, whichever you prefer). These are approved
LinkedIn integrations: you click *Connect*, a LinkedIn login window opens in **your** browser, you approve, and the
connection lives inside that service. You never create or copy a token, and nobody else sees one.

Scenario in Make.com:

1. **Schedule:** every day at 08:30, time zone *Asia/Dubai*.
2. **HTTP, make a request:** GET
   `https://raw.githubusercontent.com/Udayakumarg/uaeitjobs-web-app/social-feed/post.json`, parse JSON = yes.
3. **HTTP, get a file:** the `imageUrl` field.
4. **LinkedIn Pages, create a company post:** text = `text`, image = the file from step 3. (You must be a
   super admin or content admin of the page.)
5. **LinkedIn Pages, create a comment** on that post: text = `firstComment`.
6. Run once to test, then switch the schedule on.

Check each service's current free-plan limits. A daily post uses a handful of operations.

### C. Direct LinkedIn API (only if you really want to own the integration)

LinkedIn does not offer a "generate a token" button for posting to a company page. You would register an app at
<https://developer.linkedin.com>, associate it with the page, and apply for the **Community Management API**
product, which LinkedIn reviews and may decline. After approval, tokens come from an OAuth flow and expire, so
someone has to refresh them. If you get approved, a small script can post straight from the Action using a token
stored as a GitHub **secret**. **Never paste a token in chat or commit it.** Option B gets you the same daily
post without any of this.

---

## Troubleshooting

- *"Not enough fresh data" in the log:* the generator posted a tip instead. That is by design.
- *Image looks different on your machine:* the card uses system fonts. It renders consistently in the Action.
- *Want other wording or more tips:* edit `content/tips.json` and `content/questions.json`; each entry is title +
  body + tags.
