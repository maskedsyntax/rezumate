# Google Play Payments Backend

Minimal Node.js 22 and TypeScript service for Cloud Run. It verifies Play Integrity tokens, checks one-time purchases against Android Publisher, acknowledges purchased non-consumables, and records an idempotent audit document in Firestore.

Current production deployment:

- Project: `rezumate-android-pay-2026` (`170381053908`)
- Region: `us-central1`
- Service: `google-play-payments`
- Verification endpoint: `https://google-play-payments-170381053908.us-central1.run.app/v1/google-play/purchases/verify`
- RTDN topic: `projects/rezumate-android-pay-2026/topics/play-rtdn`
- Error alert: `aftaab@aftaab.dev` through `infra/payment-failure-alert.yaml`

The service never stores raw purchase tokens, Play Integrity tokens, resume content, or job-description content. Firestore document IDs are SHA-256 purchase-token hashes.

## Endpoints

- `GET /healthz`: liveness endpoint.
- `POST /v1/google-play/purchases/verify`: app-facing verification.
- `POST /v1/google-play/rtdn`: authenticated Pub/Sub push endpoint for Google Play Real-time Developer Notifications (RTDN).

Client verification body:

```json
{
  "packageName": "com.aftaab.rezumate",
  "productId": "rezumate_pro_lifetime",
  "purchaseToken": "token-from-Play-Billing",
  "integrityToken": "token-from-Play-Integrity"
}
```

A successful request returns HTTP 200. `entitled` is `true` only when Android Publisher reports `PURCHASED`, the allowlisted non-consumable has not been consumed, and it is acknowledged (or this service successfully acknowledges it). Pending, cancelled, consumed, unknown, and missing purchases return `entitled: false` and are never accepted as entitled.

## Integrity Binding

Before requesting a Standard Play Integrity token, the Android client must set `requestHash` to the unpadded base64url SHA-256 digest of this exact UTF-8 string:

```text
<packageName>\n<productId>\n<purchaseToken>
```

For example, the digest operation is equivalent to:

```kotlin
val payload = "$packageName\n$productId\n$purchaseToken"
val requestHash = Base64.encodeToString(
    MessageDigest.getInstance("SHA-256").digest(payload.toByteArray(Charsets.UTF_8)),
    Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
)
```

The backend rejects missing/mismatched hashes, stale verdicts, wrong packages, unrecognized apps, unexpected signing certificates, unlicensed accounts, and devices that do not meet `MEETS_DEVICE_INTEGRITY`. Generate the integrity token immediately before verification; the default freshness window is 120 seconds.

## Local Development

Requirements: Node.js 22, Application Default Credentials, a Firestore Native-mode database, and a Play Console service account with access to the app.

```bash
cp .env.example .env
npm ci
set -a; source .env; set +a
npm run dev
```

For local ADC:

```bash
gcloud auth application-default login
gcloud config set project PROJECT_ID
```

Do not download or commit service-account keys. Cloud Run uses its attached service account through ADC.

## Configuration

- `GOOGLE_PLAY_PACKAGE_NAME`: the one accepted Android application ID.
- `NON_CONSUMABLE_PRODUCT_IDS`: comma-separated allowlist. Only these IDs can be acknowledged or entitled.
- `PLAY_CERTIFICATE_SHA256_DIGESTS`: comma-separated base64url SHA-256 certificate digests exactly as returned by Play Integrity. Include each active Play App Signing certificate during a certificate rotation.
- `INTEGRITY_MAX_AGE_SECONDS`: accepted integrity-verdict age, 30-600; defaults to 120.
- `FIRESTORE_COLLECTION`: audit collection; defaults to `google_play_purchases`.
- `PUBSUB_AUDIENCE`: exact OIDC audience configured on the push subscription, normally the full RTDN endpoint URL.
- `PUBSUB_SERVICE_ACCOUNT_EMAIL`: the only service-account email accepted from the verified Pub/Sub OIDC token.
- `PORT`: defaults to 8080 and is set by Cloud Run.

## Google Cloud And Play Setup

Set shell variables first:

```bash
export PROJECT_ID="your-project"
export REGION="us-central1"
export SERVICE="google-play-payments"
export RUNTIME_SA="play-payments-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
export PUSH_SA="play-rtdn-push@${PROJECT_ID}.iam.gserviceaccount.com"
export PUBSUB_AUDIENCE="https://google-play-payments.example/rtdn"
gcloud config set project "$PROJECT_ID"
```

Enable APIs and create Firestore if the project does not already have it:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com androidpublisher.googleapis.com playintegrity.googleapis.com pubsub.googleapis.com
gcloud firestore databases create --location=nam5 --type=firestore-native
gcloud artifacts repositories create payments --repository-format=docker --location="$REGION"
```

Create the runtime identity and grant only Firestore data access in Google Cloud:

```bash
gcloud iam service-accounts create play-payments-runtime
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RUNTIME_SA}" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RUNTIME_SA}" --role="roles/serviceusage.serviceUsageConsumer"
```

In Google Play Console:

1. Link the app's Play Integrity configuration to this Google Cloud project and enable Standard requests.
2. Invite `RUNTIME_SA` under **Users and permissions**.
3. Grant access only to the target app and the permissions needed to view purchases and manage orders/subscriptions so Android Publisher can read and acknowledge purchases.
4. Confirm the non-consumable product IDs match `NON_CONSUMABLE_PRODUCT_IDS`.

Build and deploy from this directory. Use Secret Manager or Cloud Run environment configuration; never bake credentials into the image.

```bash
gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/payments/google-play-payments:latest"
gcloud run deploy "$SERVICE" \
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/payments/google-play-payments:latest" \
  --region "$REGION" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_PLAY_PACKAGE_NAME=com.aftaab.rezumate,NON_CONSUMABLE_PRODUCT_IDS=rezumate_pro_lifetime,PLAY_CERTIFICATE_SHA256_DIGESTS=YOUR_DIGEST,INTEGRITY_MAX_AGE_SECONDS=120,FIRESTORE_COLLECTION=google_play_purchases,PUBSUB_AUDIENCE=${PUBSUB_AUDIENCE},PUBSUB_SERVICE_ACCOUNT_EMAIL=${PUSH_SA}"
```

The service is public because the mobile verification route cannot use Cloud Run IAM. The RTDN route separately requires and verifies a Google-signed OIDC token, including exact audience and service-account email. Put production abuse controls such as Cloud Armor/API Gateway rate limiting in front of the app-facing route if needed.

## RTDN Pub/Sub

Create the push identity and topic:

```bash
gcloud iam service-accounts create play-rtdn-push
gcloud pubsub topics create play-rtdn
gcloud pubsub topics add-iam-policy-binding play-rtdn \
  --member="serviceAccount:google-play-developer-notifications@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

Permit the Pub/Sub service agent to mint OIDC tokens for the push identity:

```bash
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
PUBSUB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "$PUSH_SA" \
  --member="serviceAccount:${PUBSUB_AGENT}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Create the subscription after replacing `SERVICE_URL` with the deployed hostname. The audience must exactly equal `PUBSUB_AUDIENCE`:

```bash
export RTDN_URL="https://SERVICE_URL/v1/google-play/rtdn"
gcloud pubsub subscriptions create play-rtdn-push \
  --topic=play-rtdn \
  --push-endpoint="$RTDN_URL" \
  --push-auth-service-account="$PUSH_SA" \
  --push-auth-token-audience="$PUBSUB_AUDIENCE" \
  --expiration-period=never \
  --message-retention-duration=7d
gcloud pubsub subscriptions add-iam-policy-binding play-rtdn-push \
  --member="serviceAccount:${PUBSUB_AGENT}" \
  --role="roles/pubsub.subscriber"
```

The principal running the subscription command needs `iam.serviceAccounts.actAs` on `PUSH_SA`. In Play Console, select `projects/PROJECT_ID/topics/play-rtdn` as the RTDN topic and send a test notification.

RTDN payloads are not trusted as proof of purchase. For every one-time-product notification, the service independently queries Android Publisher, applies the same state rules, acknowledges eligible purchases, and updates the token-hash audit document. Non-2xx responses retry for the seven-day retention window instead of being discarded after a finite dead-letter attempt count. The subscription never expires from inactivity.

If the organization enforces the legacy `iam.allowedPolicyMemberDomains` constraint, Google Play's
system publisher identity cannot be granted access until that constraint is overridden for this
dedicated project. `infra/allow-google-play-rtdn-publisher.yaml` contains the project-specific
override used here. This permits external IAM principals at policy evaluation time; keep actual IAM
bindings narrowly scoped and audit them regularly.

## Firestore Audit Shape

Collection documents are keyed by `sha256(purchaseToken)` in lowercase hex and contain package/product IDs, status, entitlement and acknowledgement flags, timestamps, attempt count, last source, and optional RTDN message ID. Transactions enforce that a token hash cannot be rebound to different package/product metadata. Raw purchase and integrity tokens are never written or logged.

## Verification

```bash
npm test
npm run typecheck
npm run build
docker build -t google-play-payments .
```
