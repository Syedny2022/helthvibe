# ============================================================
# Helthvibe — one-command end-to-end launch.
#
# 1. Copy .env.example to .env and fill in GITHUB_TOKEN and
#    CLOUDFLARE_API_TOKEN.
# 2. Run:  .\scripts\launch.ps1
#
# It authenticates with GitHub, creates the public repo and pushes main,
# runs the Cloudflare setup (Pages project, custom domains, DNS, Web
# Analytics), then prints the remaining manual steps.
# ============================================================

$ErrorActionPreference = "Stop"

$envPath = Join-Path (Join-Path $PSScriptRoot "..") ".env"
if (-not (Test-Path $envPath)) {
  Write-Host "Copy .env.example to .env, fill in your tokens, then re-run this script." -ForegroundColor Yellow
  exit 1
}

Get-Content $envPath | ForEach-Object {
  if ($_ -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim(), "Process")
  }
}

$githubToken = $env:GITHUB_TOKEN
$cfToken = $env:CLOUDFLARE_API_TOKEN

# ------------------------------------------------------------------
# 1. GitHub
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[1/3] GitHub" -ForegroundColor Cyan
if (-not $githubToken) {
  Write-Host "  skipped - no GITHUB_TOKEN in .env" -ForegroundColor Yellow
} else {
  $env:GH_TOKEN = $githubToken

  if (Get-Command gh -ErrorAction SilentlyContinue) {
    "$githubToken" | gh auth login --with-token 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Host "  GitHub authenticated" -ForegroundColor Green }

    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
      gh repo create Syedny2022/helthvibe --public --source=. --remote=origin `
        --description "Free, privacy-first health calculator suite (BMI, BMR, TDEE, body fat) - Astro + Cloudflare Pages"
      Write-Host "  repository created" -ForegroundColor Green
    }
  } else {
    Write-Host "  gh not found - using the token directly with git." -ForegroundColor Yellow
    $remote = git remote get-url origin 2>$null
    if (-not $remote) {
      Write-Host "  No origin remote and gh is not installed." -ForegroundColor Yellow
      Write-Host "  Create the repo at https://github.com/new (name: helthvibe, public), then re-run this script."
    } else {
      git remote set-url origin "https://x-access-token:${githubToken}@github.com/Syedny2022/helthvibe.git"
    }
  }

  git push -u origin main
  Write-Host "  pushed to main" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 2. Cloudflare
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[2/3] Cloudflare" -ForegroundColor Cyan
if (-not $cfToken) {
  Write-Host "  skipped - no CLOUDFLARE_API_TOKEN in .env" -ForegroundColor Yellow
} else {
  npm run cf:setup
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Cloudflare setup failed - see the error above." -ForegroundColor Red
  }
}

# ------------------------------------------------------------------
# 3. Remaining manual steps
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[3/3] What to do next" -ForegroundColor Cyan
Write-Host @"

  Everything left is a one-time browser step. Open docs/LAUNCH.md and follow
  the steps in order (GitHub repo connect, GSC, Bing, GA4).

  Quick reference:
  A. Connect the repo to Cloudflare Pages (one click):
     Workers & Pages -> helthvibe -> Settings -> Git -> Connect to Git
     -> Syedny2022/helthvibe, production branch main
     Build settings: build command npm run build, output dist, env NODE_VERSION=22
  B. Google Search Console:
     search.google.com/search-console -> Add property (Domain) -> helthvibe.com
     -> publish the TXT record it shows you with:
        npm run cf:dns -- --name google-site-verification --content <token>
     -> submit the sitemap https://helthvibe.com/sitemap-index.xml
  C. Bing Webmaster Tools:
     bing.com/webmasters -> Import from Google Search Console
     -> submit the sitemap
  D. Google Analytics 4 (optional):
     analytics.google.com -> Create property -> Web -> https://helthvibe.com
     -> set PUBLIC_GA_ID in Pages -> Settings -> Environment variables -> redeploy
     Until then the site ships zero third-party scripts.
"@ -ForegroundColor White