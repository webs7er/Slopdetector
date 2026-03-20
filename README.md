<p align="center">
  <img src="icons/slopmoji.png" alt="Slopdetector Logo" width="128" height="128">
</p>

<h1 align="center">Slopdetector</h1>

<p align="center">
  <strong>AI Content Detector for Social Media</strong><br>
  Detect AI-generated posts and comments on Reddit and LinkedIn using your choice of LLM provider.
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#features">Features</a> •
  <a href="#supported-platforms">Platforms</a> •
  <a href="#ai-providers">Providers</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/vihrenp" title="Support this project">
    <img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-%23FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee">
  </a>
</p>

---

## What Is Slopdetector?

Slopdetector is a browser extension that helps you identify AI-generated content ("slop") on social media. It adds a scan button to posts and comments, sends the text to an LLM of your choice for analysis, and shows you a confidence score indicating how likely the content is to be AI-generated.

## How It Works

1. Slopdetector inserts scan buttons <img src="icons/icon16.png" width="16" height="16"> next to posts on [supported social media pages](#supported-platforms).
2. When you click a scan button, the text of the post is extracted and sent to an [AI service provider of your choice](#ai-provider-support) for analysis.
3. An AI model examines the text for linguistic patterns that can help determine if it was written by a human or an AI.
4. You receive a final report with the findings, including signals which explain why that was the verdict.

## Screenshots

<p align="center">
  <img src="docs/Slopdetector.png" alt="Slopdetector extension — settings and scan statistics overview" width="40%">
</p>

<p align="center">
  <em>The Slopdetector extension — choose your AI provider, view scan statistics and customize your settings.</em>
</p>

<p align="center">
  <img src="docs/screenshot-linkedin.png" alt="Slopdetector on LinkedIn — AI-generated verdict with detailed signals" width="49%">
  <img src="docs/screenshot-reddit.png" alt="Slopdetector on Reddit — very likely AI-generated verdict with reasoning" width="49%">
</p>

<p align="center">
  <em>Left: LinkedIn post flagged as "Likely human". Right: Reddit post flagged as "Very likely AI-generated" — both showing "Detailed Reasoning" signals.</em>
</p>

## AI Provider Support

| Provider | Status | Notes |
|----------|--------|-------|
| **[LM Studio](https://lmstudio.ai/)** | ✅ Supported | Fully local, offline analysis with no data leaving your machine |
| **[Anthropic API (Claude Models)](https://console.anthropic.com/)** | ✅ Supported | Cloud API |
| **[OpenAI API (ChatGPT Models)](https://platform.openai.com/)** | ✅ Supported | Cloud API |
| **[Google Gemini API](https://aistudio.google.com/)** | ✅ Supported | Cloud API |
| **[OpenRouter API](https://openrouter.ai/)** | ✅ Supported | Access to 100+ models through a single API |

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Reddit** | ✅ Supported | Posts and comments on `reddit.com` and `old.reddit.com` |
| **LinkedIn** | ✅ Supported | Feed posts including suggested and sponsored content |
| X / Twitter | 🔜 Coming soon! | — |

More platforms will be added based on popular demand. Feel free to [submit a request](https://github.com/webs7er/Slopdetector/issues/new).

## Browser Compatibility
| |
| ----- |
| ✅ **Chrome, Edge, Brave, Opera** (Chromium-based browsers)  |
| ❌ **Firefox** (Manifest V3) |

## Installation

### From the Chrome Web Store

[Install Slopdetector from the Chrome Web Store](https://chromewebstore.google.com/detail/klddclokoaiflemooohmomoljkpcjalf?utm_source=item-share-cb)

<details>
<summary><strong>Alternative: Manual Installation (For Developers)</strong></summary>

1. **Download** — Clone or download this repository:
   ```bash
   git clone https://github.com/webs7er/Slopdetector.git
   ```
2. **Open the extensions page** — Navigate to `chrome://extensions/` in Chrome (or `edge://extensions/` in Edge, etc.)
3. **Enable Developer Mode** — Toggle the switch in the top-right corner
4. **Load the extension** — Click **"Load unpacked"** and select the project folder
5. **Pin it** — Click the puzzle-piece icon in the toolbar and pin **Slopdetector** for easy access

</details>

## Getting Started

### 1. Choose an AI Provider

To analyze posts, Slopdetector requires access to an AI model. You have two options: use a **local model** via LM Studio (free, private, but requires decent hardware) or use a **cloud provider** (OpenAI, Anthropic, OpenRouter, Google Gemini) which requires an API key.

#### Using a Cloud Provider (API Key required)

An API key is a secure token that allows Slopdetector to communicate with your chosen AI provider's servers on your behalf. Since cloud models cost a fraction of a cent per request to run, the key links these requests to your account. Your keys are stored locally on your device and are never shared with us.

1. **Create an account** — Sign up at the developer platform of your chosen provider ([Google AI Studio](https://aistudio.google.com/), [OpenAI](https://platform.openai.com/), [Anthropic](https://console.anthropic.com/), or [OpenRouter](https://openrouter.ai/)).
2. **Add credits** — You generally need to add a few dollars to your account balance to activate API usage.
3. **Generate the key** — Navigate to the "API Keys" section in the provider's dashboard and click "Create new secret key".
4. **Copy the key** — It will look like a long, random string of characters (e.g., `sk-proj...` or `sk-ant...`). *Keep this secret, do not share it!*
5. **Configure Slopdetector** — Click the extension icon in your browser toolbar, select the corresponding provider from the "Model Selection" dropdown, and paste your API key into the input field. The extension will save it automatically.

#### Using LM Studio (Local, Free)

1. **Install** — [Download and install LM Studio](https://lmstudio.ai/).
2. **Download a model** — Search for and download a small, capable model within the app (e.g., a 7B or 8B parameter model like Llama 3 or Qwen).
3. **Start the server** — Navigate to the "Local Server" tab in LM Studio and click **Start Server**.
4. **Configure Slopdetector** — Open the extension, choose **LM Studio (Local)**, and ensure the URL matches the LM Studio server (the default `http://localhost:1234` is usually correct).

### 2. Scan a Post

1. Navigate to **Reddit** or **LinkedIn**
2. Look for the scan button (<img src="icons/icon16.png" width="16" height="16">) next to posts and comments
3. Click it to analyze the content
4. View the result indicator:

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Likely written by a human |
| 🟡 Yellow | Ambiguous — could be either |
| 🟠 Orange | Likely AI-generated |
| 🔴 Red | High confidence AI-generated |

5. Hover over the indicator to see the confidence score and detailed reasoning

### 3. Customize Your Settings

Slopdetector offers several options to tailor the content analysis and interface to your preferences. Open the extension popup to tweak these configurations:

- **Show Certainty %** — Display the raw confidence score
- **Detailed Reasoning** — Show human and AI signals explaining the verdict
- **Minimum Post Length** — Skip short posts below a word count threshold
- **Detection Sensitivity** — Adjust the score boundaries between human/ambiguous/AI zones

#### Experimental Features

Under the expandable **Experimental Features** section you can:
- Adjust the **model temperature** (precision vs. creativity)
- Edit the **system prompt** and **output format** for custom analysis behavior
- Fine-tune the **AI-content score sensitivity** zones with a visual drag-to-resize bar



## Privacy

- **LM Studio** runs entirely on your machine — no data leaves your computer.
- **Cloud providers** (OpenAI, Claude, OpenRouter, Gemini) send post text to their APIs for analysis. Your API keys are stored locally in Chrome's extension storage and are never shared.
- Slopdetector does **not** collect, store, or transmit any browsing data or analytics.

## Troubleshooting

<details>
<summary><strong>Scan buttons don't appear</strong></summary>

- Make sure detection is **enabled** (toggle in the header)
- Check that posts meet the **minimum word count** (if the filter is enabled)
- Try refreshing the page — some dynamically loaded content needs a reload

</details>

<details>
<summary><strong>Connection issues with LM Studio</strong></summary>

- Ensure LM Studio is running and a model is loaded
- Verify the server URL in settings matches your LM Studio config (default: `http://localhost:1234`)
- Check that the LM Studio server is actually started (look for the server toggle in LM Studio)

</details>

<details>
<summary><strong>Slow or failed analysis</strong></summary>

- Cloud providers may have rate limits — wait a moment and try again
- For LM Studio, try a smaller/faster model
- Increase the **minimum post length** filter to reduce the number of API calls
- If the error persists, [submit an issue.](https://github.com/webs7er/Slopdetector/issues/).

</details>

## Contributing

Contributions are welcome! Feel free to [open an issue](https://github.com/webs7er/Slopdetector/issues/) or [start a discussion](https://github.com/webs7er/Slopdetector/discussions). 

Alternatively, you can also [submit a pull request](https://github.com/webs7er/Slopdetector/pulls/):

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Disclaimer

Slopdetector provides **estimates** based on LLM analysis and is not 100% accurate. Use it as a helpful indicator, not as definitive proof of AI-generated content. Accuracy depends on the quality of the LLM model you use.
