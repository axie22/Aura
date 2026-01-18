# Aura (NexHacks) 

> **The AI-Powered UI Review Agent for GitHub**

**Aura** is an intelligent GitHub App that autonomously reviews User Interface changes in Pull Requests. It analyzes your code diffs, understands your repository context, and brings static code changes to life by generating automated walkthroughs.

## The Problem
Reviewing frontend can be hard. Reading a diff of a `.tsx` file doesn't tell you if the button actually clicks or if the layout looks right. Developers often have to pull the branch, install dependencies, and run the app just to check a simple UI tweak.

## The Solution
Aura sits in your repo and watches for changes. When a PR is opened:
1.  **Analyzes the Diff:** Identifies exactly which UI components changed.
2.  **Fetches Remote Context:** Uses the GitHub API to read the relevant source code from the branch—no local cloning required.
3.  **Generates a Plan:** Uses **Google Gemini 1.5 Flash** to create a custom **Playwright** walkthrough script tailored to that specific change.
4.  **Delivers Feedback:** Posts a concise summary and the video walkthrough directly to the PR comments.

## How to Run

**Zero Setup Required.**

1.  **Install Aura:** Go to [https://github.com/apps/aurapr](https://github.com/apps/aurapr).
2.  **Select Repository:** Choose the repository you want Aura to review.
3.  **Allow Access:** Grant standard permissions.
4.  **Done!** Open a PR with a `.tsx` or `.css` change and watch Aura convert your diff into a video walkthrough automatically.


