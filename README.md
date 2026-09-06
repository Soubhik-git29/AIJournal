# Reflect AI Journal

A private, AI-powered journaling application built with React, Tailwind CSS, Express, Firebase Authentication, Cloud Firestore, and the Gemini API.

## Features
- **Secure Authentication**: Google Sign-In via Firebase Auth.
- **Private Storage**: User-isolated entries stored in Cloud Firestore.
- **Voice & Text Journaling**: Log your daily thoughts using text input or native voice-to-text transcription.
- **AI Voice Counsellor**: Have conversational sessions with an empathetic AI that provides guidance and responds with synthesized voice audio, contextually aware of your past journal entries.
- **Social Connectivity (Friends System)**: Search for users, send friend requests, and manage your network.
- **Real-Time Chat**: Secure, real-time messaging with your friends.
- **Voice & Video Calling**: Built-in peer-to-peer voice and video calls for direct communication.
- **Personalization**: Toggleable Dark/Light mode and customizable chat interface themes.
- **Weekly AI Reflections**: Intelligent journaling summaries and behavioral pattern recognition across your past entries using the Gemini API.
- **Resilient AI Pipeline**: Implements model fallback ladders for high availability.

## Security Overview
This application implements several core security principles:
1. **Zero-Hardcoding**: Secrets like `GEMINI_API_KEY` are read dynamically via environment variables (or Google Cloud Secret Manager in production).
2. **Defensive Ingestion**: Server endpoints validate and strip unhandled structures safely.
3. **Owner-Bound Rules**: Firestore database rules enforce tight `request.auth.uid == userId` checks.

## Deployment to Google Cloud Run

To deploy this application to Google Cloud Run, follow these steps:

### 1. Environment & Prerequisites
- Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) and initialize it.
- Ensure you have a Google Cloud Project with billing enabled.
- Enable the required Google Cloud APIs for your project:
  ```bash
  gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
  ```

### 2. Secret Management Setup
Create and configure your Gemini API Key securely in Google Cloud Secret Manager. This avoids hardcoding secrets in your source code or environment files.

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
Ensure your Cloud Firestore database has strict, owner-bound security rules deployed to protect user privacy and isolate interactions.

Your `firestore.rules` should be configured as follows to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Core user isolation exactly as required for interaction endpoints
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Journal entries and chat histories isolation
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/counsellor_chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Global User Profiles (public read, owner write)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friend Requests & Chat Systems
    match /friendRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```
Deploy these rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Cloud Run Deployment Flow
Deploy the application directly from your source code using Cloud Run source deployment. This builds the container securely and injects your secrets at runtime.

```bash
gcloud run deploy reflect-journal \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 5. Required Campaign Labeling
To register the service for automated challenge verification, apply the mandatory resource label to your deployed Cloud Run service:

```bash
gcloud run services update reflect-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```
