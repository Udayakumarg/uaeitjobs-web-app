# URL Import Engine

## Routing (HRController.importPreview)
```java
if (LINKEDIN_JOB_URL.matcher(url).matches()) {
    // linkedin.com/jobs/view/* → LinkedInScraperService
    LinkedInJobData ld = linkedInScraperService.scrapeLinkedInJob(url);
    return Preview.builder()
        .title(ld.getTitle()).companyName(ld.getCompanyName())
        .description(ld.getDescription()).locationUae(ld.getLocation())  // ← location field added Jun 2026
        .applyUrl(url).complete(true).build();
}
return urlJobScraperService.scrape(url);
```

Duplicate check runs BEFORE scraping: `jobService.existsByApplyUrl(url)` → throws 400 if exists.

## UrlJobScraperService (non-LinkedIn)

### Extraction order
1. **JSON-LD** `tryJsonLd(doc)` — looks for `<script type="application/ld+json">` with `@type: JobPosting`
   - `jobLocation` handled as BOTH object and array:
     ```java
     JsonNode locNode = node.path("jobLocation");
     if (locNode.isArray() && locNode.size() > 0) locNode = locNode.get(0);
     String city = coalesce(addrNode.path("addressLocality").asText(""),
                            addrNode.path("addressRegion").asText(""));
     ```
2. **Open Graph** `parseDocument(doc)`:
   - Title: `og:title` → `twitter:title` → `<title>` (site suffix stripped)
   - Company: `og:site_name` → domain heuristic
   - Description: `og:description` → `twitter:description` → `meta[name=description]`
   - Location: `og:locality` → `inferUaeCity(title + description)`
3. **Playwright fallback** for JS-rendered pages (Avature, Workday, iCIMS):
   - `isJsRendered(doc)` detects loading placeholders
   - `PlaywrightScraperService.fetchRenderedHtml(url)` launches Chromium
   - Tries JSON-LD again on rendered HTML
   - Then `extractRenderedDescription(doc)` via ATS-specific CSS selectors

### inferUaeCity (static, in UrlJobScraperService)
```java
String t = text.toLowerCase().replace('-', ' ');  // ← hyphen normalisation
if (t.contains("abu dhabi"))      return "Abu Dhabi";
if (t.contains("ras al khaimah")) return "Ras Al Khaimah";
if (t.contains("umm al quwain"))  return "Umm Al Quwain";
if (t.contains("dubai"))          return "Dubai";
// sharjah, ajman, fujairah...
```

## LinkedInScraperService

### Extraction order
```java
String loc = textOfFirst(doc,
    "span.jobs-details-top-card__bullet",  // authenticated layout
    ".jobs-unified-top-card__bullet",       // unified layout
    ".topcard__flavor--bullet",             // public guest layout ← confirmed working
    "span[class*='tvm__text--positive']",
    "[data-test-job-poster-location]"
);
if (!loc.isBlank()) return inferUaeCity(loc);
return inferUaeCity(title + " " + description);
```

### LinkedInJobData fields
title, companyName, description, requirements, **location** (added Jun 2026), salary, skills, jobType, experienceLevel, linkedInUrl

### SSRF protection
- Only `https://` accepted
- LinkedIn scraper: only `www.linkedin.com` and `linkedin.com` hosts allowed
- Generic scraper: rejects loopback/site-local/link-local/multicast IPs

## UrlImportDTO.Preview fields
```java
String title, companyName, description, locationUae, applyUrl;
boolean complete;
String message;  // null when complete=true
```
Frontend uses `locationUae` to pre-populate the emirate `<Select>` dropdown.
