# Reflect AI Journal

A private, AI-powered journaling application built with React, Tailwind CSS, Express, Firebase Authentication, Cloud Firestore, and the Gemini API.

## Features
- **Secure Authentication**: Google Sign-In via Firebase Auth.
- **Private Storage**: User-isolated entries stored in Cloud Firestore.
- **AI Reflections**: Intelligent journaling summaries and empathetic responses using the Gemini API.
- **Resilient AI Pipeline**: Implements model fallback ladders for high availability.

## Security Overview
This application implements several core security principles:
1. **Zero-Hardcoding**: Secrets like `GEMINI_API_KEY` are read dynamically via environment variables (or Google Cloud Secret Manager in production).
2. **Defensive Ingestion**: Server endpoints validate and strip unhandled structures safely.
3. **Owner-Bound Rules**: Firestore database rules enforce tight `request.auth.uid == userId` checks.

## Deployment to Google Cloud Run

To deploy this application to Google Cloud Run, follow these steps:

### 1. Prerequisites
- Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install).
- Enable required Google Cloud APIs:
  ```bash
  gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
  ```

### 2. Secret Management Setup
Create and configure your Gemini API Key in Secret Manager:
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

### 3. Database Security Configuration
Ensure your `firestore.rules` is configured exactly as follows to ensure user data isolation:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Run Deployment Flow
Deploy the application directly from the source code:
```bash
gcloud run deploy reflect-journal \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 5. Required Campaign Labeling (If applicable)
Apply the mandatory resource label to register the service for automated challenge verification:
```bash
gcloud run services update reflect-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```
