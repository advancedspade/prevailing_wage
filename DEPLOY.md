# Deploying to Google Cloud Run

## Do I need GitHub? Where is Cloud Run created?

**You don’t need GitHub to get the app up.** You can deploy from your own machine:

1. Open a terminal in this project folder.
2. Log in and set your GCP project (steps 1–2 below).
3. Run **one** of these from the project root:
   - **`gcloud builds submit --config=cloudbuild.yaml`** – uploads your **local** code to Google Cloud Build, builds the image, then runs **`gcloud run deploy`** for you. That **creates** the Cloud Run service if it doesn’t exist, or updates it if it does.
   - **`gcloud run deploy prevailing-wage --source . --region us-central1 --allow-unauthenticated`** – same idea: uploads local source, builds in the cloud, and creates/updates the Cloud Run service.

**Where is the Cloud Run instance?** In **your GCP project**, in the **region** you chose (e.g. `us-central1`). After the command finishes you get a URL like `https://prevailing-wage-xxxxx-uc.a.run.app`. In the [Cloud Run console](https://console.cloud.google.com/run) you’ll see a service named `prevailing-wage` (or whatever name you used) in that project and region.

**GitHub is optional** for a one-off deploy. If you want **automatic deploys on commit** (e.g. push to `staging` → deploy staging, push to `production` → deploy production), push the repo to GitHub and set up the two Cloud Build triggers in **section 3b**.

---

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and logged in
- A GCP project with billing enabled
- **Auth:** Google OAuth 2.0 Client ID and secret (APIs & Services → Credentials)
- **Database:** Cloud SQL PostgreSQL instance and connection details

## 1. Set your GCP project

```bash
gcloud config set project YOUR_PROJECT_ID
```

## 2. Enable required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## 3. Build and deploy

From the project root:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Or deploy from source (builds the image in the cloud):

```bash
gcloud run deploy prevailing-wage \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Create the Artifact Registry repo if needed:

```bash
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker --location=us-central1
```

After the first deploy, set **environment variables** on the Cloud Run service (see step 5): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`.

---

## 3b. Automated deploy on push (staging + production)

You can use **GitHub Actions** (CI/CD in `.github/workflows`) – they build the Docker image and deploy to Cloud Run directly. Alternatively, **Cloud Build triggers** can run the root `cloudbuild.yaml` with substitutions (see Option B).

---

### Option A: GitHub Actions (recommended – CI/CD in `.github/workflows`)

Workflows in `.github/workflows/` run on push and call Cloud Build to build and deploy. They use **Workload Identity Federation (WIF)** so you don’t need a JSON key (works when your org disallows key creation).

**One-time setup: Workload Identity Federation**

Run these in a terminal (replace `YOUR_PROJECT_ID`, `YOUR_GITHUB_ORG`, and `YOUR_REPO` with your values; repo is `org/repo` e.g. `mycompany/prevailing-wage`). Use your **existing** service account and/or **existing** WIF pool (e.g. pool `github-pool`, provider `github-provider`) when you have them.

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export GITHUB_ORG=YOUR_GITHUB_ORG
export REPO="${GITHUB_ORG}/YOUR_REPO"
export SA_EMAIL="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"
# If reusing an existing pool, set these and skip the "Create pool/provider" step
export POOL_NAME="github-pool"
export PROVIDER_NAME="github-provider"

# 1. (Optional) If you created a new SA, grant it roles. If using an existing SA (e.g. github-actions-sa), ensure it has:
#    roles/cloudbuild.builds.editor, roles/iam.serviceAccountUser, roles/storage.admin
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# 2. Create Workload Identity Pool and OIDC provider for GitHub (skip if you already have one)
export POOL_NAME="github-pool"
export PROVIDER_NAME="github-provider"
gcloud iam workload-identity-pools create "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Allow GitHub (this repo) to impersonate the service account
POOL_ID=$(gcloud iam workload-identity-pools describe "${POOL_NAME}" --project="${PROJECT_ID}" --location="global" --format="value(name)")
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${REPO}"
```

**Get the WIF provider resource name** (you’ll put it in GitHub as `WIF_PROVIDER`). Use your pool and provider names (e.g. `github-pool` and `github-provider`):

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

Example output: `projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider`. Use that full string.

**Ensure Cloud Build’s service account can deploy to Cloud Run** (project default):

```bash
# Get project number (different from project ID)
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

**Add GitHub secrets** (repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g. `my-project`) |
| `WIF_PROVIDER` | Full WIF provider name from the `describe` command above (e.g. `projects/123456789012/locations/global/workloadIdentityPools/github/providers/github`) |
| `WIF_SERVICE_ACCOUNT` | Your SA email, e.g. `github-actions-sa@tools-471222.iam.gserviceaccount.com` |

**First deploy:** The first push to `staging` (or `production`/`main`) will create the Cloud Run service if it doesn’t exist. Ensure the Artifact Registry repo exists (e.g. create `cloud-run-source-deploy` in the Console or run `gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=us-central1` once). Then set **env vars** for each service in Cloud Run (staging vs production URLs and DBs).

**Behavior:**

- Push to **`staging`** → workflow `Deploy to Staging` runs → deploys to **prevailing-wage-staging**.
- Push to **`production`** or **`main`** → workflow `Deploy to Production` runs → deploys to **prevailing-wage-production**.

Workflow files: `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml`.

---

### Option B: Cloud Build triggers (runs in GCP, no GitHub Actions)

If you prefer Cloud Build to run the build on push instead of GitHub Actions, connect the repo in [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers) and create triggers that run **`cloudbuild.yaml`** with substitutions (e.g. `_SERVICE_NAME=prevailing-wage-staging` for staging, `prevailing-wage-production` for production). The root **`cloudbuild.yaml`** deploys to a single service; you’d duplicate the trigger and override `_SERVICE_NAME` per branch, or maintain separate config files. GitHub Actions (Option A) is the default and does not require Cloud Build config files.

---

### Branch strategy

- **staging** – testing; push or merge here to deploy to staging.
- **production** or **main** – live; merge from staging (or release) to deploy to production.

---

## 4. Cloud SQL (PostgreSQL) database

The app uses **Cloud SQL for PostgreSQL** for all data (profiles, tickets, employee_periods). Auth is **Google OAuth** via NextAuth.

### 4.1 Create a Cloud SQL instance

```bash
gcloud sql instances create prevailing-wage-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

Create a database and user:

```bash
gcloud sql databases create app --instance=prevailing-wage-db
gcloud sql users set-password postgres --instance=prevailing-wage-db --password=YOUR_SECURE_PASSWORD
```

### 4.2 Run the schema

Connect (e.g. via Cloud SQL Proxy or the Console SQL editor) and run the contents of **`cloudsql-schema.sql`** in your project root. That creates `profiles`, `tickets`, and `employee_periods` (no Supabase/auth references).

### 4.3 Connection from Cloud Run

- **Option A – Unix socket (recommended):** Add the Cloud SQL connection to your Cloud Run service, then set `DATABASE_URL` so the app connects via the socket, e.g.:

  `postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`

  Attach the connection when deploying, e.g.:

  ```bash
  gcloud run deploy prevailing-wage ... \
    --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME
  ```

- **Option B – Private IP / Public IP:** If the instance has a private or public IP, set:

  `DATABASE_URL=postgresql://USER:PASSWORD@IP:5432/DATABASE`

Use Secret Manager for the password in production and reference it as an env var in Cloud Run.

## 5. Runtime environment variables

Set these on the Cloud Run service (Variables & secrets):

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | From APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client |
| `NEXTAUTH_SECRET` | Run `npx auth secret` to generate |
| `NEXTAUTH_URL` | Your app URL, e.g. `https://prevailing-wage-xxx.run.app` |
| `DATABASE_URL` | Cloud SQL connection string (see step 4) |

**Authorized redirect URI** for your Google OAuth client must include:
- `https://YOUR_CLOUD_RUN_URL/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` (for local dev)

```bash
gcloud run services update prevailing-wage --region us-central1 \
  --set-env-vars "GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=...,NEXTAUTH_SECRET=...,NEXTAUTH_URL=https://...,DATABASE_URL=..."
```

Or set them in the [Cloud Console](https://console.cloud.google.com/run): Edit & deploy new revision → Variables & secrets.

## 6. Creating services in the Console (staging + production)

A clean approach is **two Cloud Run services** in the same project: one for staging, one for production. Same container image, different env vars (and optionally different databases).

### 6.1 Build the image once

Build and push the image so both environments can use it:

- **Option A – Cloud Build (recommended):** In the Console go to **Cloud Build → History**, run a build (e.g. trigger from your repo or run a manual build with the project’s `cloudbuild.yaml`). The image will be in **Artifact Registry** (e.g. `us-central1-docker.pkg.dev/PROJECT_ID/cloud-run-source-deploy/prevailing-wage:SHORT_SHA` or whatever your config tags).
- **Option B – From source in Console:** When creating the first Cloud Run service (below), choose **Continuously deploy from a repository** and connect your repo; Cloud Build will build the image. You can reuse that image for the second service.

If you use the CLI, one build is enough:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Use the same image URL for both staging and production (or use a tag like `latest` and re-use it for both).

### 6.2 Create the staging service in the Console

1. Go to [Cloud Run](https://console.cloud.google.com/run) → **Create Service**.
2. **Deploy one revision from an existing container image**: choose the image you built (e.g. from Artifact Registry).  
   - Or use **Continuously deploy from a repository** and connect your repo so Cloud Build builds from source.
3. **Service name:** e.g. `prevailing-wage-staging` (or `prevailing-wage-stg`).
4. **Region:** e.g. `us-central1` (same as production for simplicity).
5. **Authentication:** “Allow unauthenticated invocations” if the app is public.
6. **Container, Variables & secrets, Connections:**
   - **Variables and secrets** → Add the staging env vars (see table below).
   - If you use Cloud SQL, open **Connections** and add the Cloud SQL instance (staging DB).
7. Create the service. Note the staging URL, e.g. `https://prevailing-wage-staging-xxxxx-uc.a.run.app`.

### 6.3 Create the production service in the Console

1. **Create Service** again (a second service).
2. Use the **same container image** as staging (from Artifact Registry).
3. **Service name:** e.g. `prevailing-wage-production` (or `prevailing-wage-prod`).
4. **Region:** same as staging (e.g. `us-central1`).
5. **Authentication:** same as staging.
6. **Variables and secrets:** set **production** values (different `NEXTAUTH_URL`, `DATABASE_URL`, and optionally different `NEXTAUTH_SECRET`; see table below).
7. **Connections:** add the **production** Cloud SQL instance if it’s different from staging.
8. Create the service. Note the production URL.

### 6.4 Environment variables per environment

| Variable | Staging | Production |
|----------|---------|------------|
| `NEXTAUTH_URL` | Staging Cloud Run URL (e.g. `https://prevailing-wage-staging-xxx.run.app`) | Production Cloud Run URL or custom domain |
| `NEXTAUTH_SECRET` | One secret (e.g. from `npx auth secret`) | **Different** secret (generate another with `npx auth secret`) |
| `DATABASE_URL` | Staging DB (see 6.5) | Production DB |
| `GOOGLE_CLIENT_ID` | Same or separate OAuth client (see 6.6) | Same or separate |
| `GOOGLE_CLIENT_SECRET` | Same or separate | Same or separate |

### 6.5 Databases: one instance vs two

- **Two databases on one Cloud SQL instance (simplest):**  
  Create two databases, e.g. `prevailing_wage_staging` and `prevailing_wage_prod`. Run `cloudsql-schema.sql` in each. Point staging service at `.../prevailing_wage_staging` and production at `.../prevailing_wage_prod`.

- **Two Cloud SQL instances (strong isolation):**  
  One instance for staging, one for production. Each has its own connection name; add the right instance in **Connections** per Cloud Run service and set the matching `DATABASE_URL`.

### 6.6 Google OAuth redirect URIs

Add **both** redirect URIs to your Google OAuth 2.0 client (APIs & Services → Credentials → your OAuth client → Authorized redirect URIs):

- `https://prevailing-wage-staging-xxxxx-uc.a.run.app/api/auth/callback/google`
- `https://prevailing-wage-production-xxxxx-uc.a.run.app/api/auth/callback/google`  
  (or your production custom domain)

Optionally use two OAuth clients (one for staging, one for production) and set different `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` per service.

### 6.7 Deploying updates

- **Staging:** Deploy a new revision (e.g. from Cloud Build or “Edit & deploy new revision” with a new image tag). Test here first.
- **Production:** When ready, deploy the **same image** (or a new build) to the production service so both run the same code with different env vars.

---

## 7. Optional: custom domain and HTTPS

Cloud Run gives you a default `*.run.app` URL with HTTPS. To use a custom domain:

- In Cloud Run: Manage custom domains → Add mapping.
- In your domain DNS: add the CNAME or A record as shown.

---

## Summary

| Step | Command / action |
|------|------------------|
| 1 | `gcloud config set project YOUR_PROJECT_ID` |
| 2 | Enable Run, Artifact Registry, Cloud Build APIs |
| 3 | `gcloud builds submit --config=cloudbuild.yaml` or `gcloud run deploy prevailing-wage --source . ...` |
| 4 | Create Cloud SQL instance, run `cloudsql-schema.sql` (and `cloudsql-auth-google-migration.sql` if you already had the schema), set `DATABASE_URL` and optional `--add-cloudsql-instances` |
| 5 | Set env vars on Cloud Run: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL` |

After deployment, the URL is shown in the terminal (e.g. `https://prevailing-wage-xxxxx-uc.a.run.app`). For **staging and production**, use two Cloud Run services in the Console with different env vars (see section 6).
