# AI Journal & Counsellor App

A full-stack, AI-powered journaling application built with React, Vite, Express, and Firebase. This application provides users with an intelligent journaling experience, complete with location-tagging, an AI counsellor, automated mood tracking, and emergency external webhook notifications.

## Features

- **Intelligent Journaling**: Log thoughts, track moods automatically with Gemini AI, and optionally tag locations using Google Maps.
- **AI Counsellor**: Chat with an empathetic, grounded AI counsellor that remembers your past 7 days of journal entries. Supports Text-to-Speech (TTS).
- **External Notifications (Slack/Discord)**: Asynchronous webhook dispatching to alert external channels when a journal entry indicates severe distress.
- **Admin Dashboard & RBAC**: Role-based access control with a dedicated dashboard to manage user privileges securely based on Firestore admin claims.
- **Secure Full-Stack Architecture**: Backend proxy for AI generation, zero-leaked credentials, and strict database security rules.

## Prerequisites

- Node.js 18+
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- A Google Cloud Project with Billing Enabled.
- Enabled APIs: Cloud Run API, Secret Manager API, Firestore API.

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in the root and add the required secrets (see `.env.example`).
   ```env
   GEMINI_API_KEY="your_api_key"
   VITE_GOOGLE_MAPS_API_KEY="your_maps_key"
   DISCORD_WEBHOOK_URL="your_discord_webhook_url"
   SLACK_WEBHOOK_URL="your_slack_webhook_url"
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Production Deployment (Google Cloud Run)

This application is designed to be deployed securely to Google Cloud Run, utilizing Google Cloud Secret Manager for credentials and Firestore for persistence.

### 1. Database Security Configuration (Firestore)

Ensure your Firestore database is secured with owner-bound security rules. Deploy the following rules via the Firebase CLI or Console to isolate user data and enforce the Admin schema:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && (
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
        request.auth.token.email == 'soubhikkumardey@gmail.com'
      );
    }

    match /admins/{adminId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /users/{userId}/entries/{entryId} {
      allow read: if request.auth != null && (request.auth.uid == userId || resource.data.isPublic == true);
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Strict user data isolation rule required by directives
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Secret Management Setup

Do not hardcode your API keys. Store them in Google Cloud Secret Manager and grant access to the Cloud Run service account.

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
# Replace YOUR_PROJECT_NUMBER with your actual Google Cloud Project Number
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Repeat the above steps for `DISCORD_WEBHOOK_URL` and `SLACK_WEBHOOK_URL` if you are using the notification feature in production.

### 3. Cloud Run Deployment Flow

Deploy the application to Cloud Run as a single bundled container:

```bash
gcloud run deploy ai-journal-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,DISCORD_WEBHOOK_URL=DISCORD_WEBHOOK_URL:latest,SLACK_WEBHOOK_URL=SLACK_WEBHOOK_URL:latest"
```

### 4. Required Campaign Labeling

Apply the mandatory resource label to register the service for automated challenge verification:

```bash
gcloud run services update ai-journal-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```
