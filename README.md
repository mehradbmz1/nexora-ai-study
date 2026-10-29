# Nexora AI Study Assistant 🎓✨

> A modern AI-powered study assistant with a minimal, premium interface inspired by ChatGPT, equipped with full-screen voice interaction, Cloudflare Workers AI integration, multimodal vision OCR, and cross-device chat sync.

---

## 🌟 Key Features

### 1. English UI & ChatGPT-Inspired Design
- Clean, spacious, and distraction-free interface with smooth animations and transitions.
- Fully responsive across desktop, tablet, and mobile devices.
- Seamless Dark and Light theme switching.
- Welcoming dashboard with suggested study topics: **Mathematics**, **Physics**, **Chemistry**, and **Biology**.

### 2. Full-Screen Voice Mode 🎙️
- Real-time animated audio visualizer orb reacting to audio frequencies.
- Distinct states: **Listening**, **Thinking**, **Speaking**, and **Muted**.
- Dual audio engine: Hardware Web Audio microphone input + simulated speech engine.
- Interactive speech interrupts, real-time live captions, and transcript saving into chat history.
- Multiple study personas (**Aura**, **Orion**, **Nova**, **Sol**).

### 3. Cloudflare Workers AI Edge Backend ⚡
- Direct integration with Cloudflare's free serverless AI catalog:
  - **Meta Llama 3.3 70B Instruct** (Flagship multilingual & STEM problem solver)
  - **Meta Llama 3.2 11B Vision** (Multimodal image reading, problem sheet OCR)
  - **DeepSeek R1 Distill Qwen 32B** (Chain-of-thought mathematical reasoning)
  - **Qwen 2.5 72B Instruct** (Multilingual mathematics & science champion)
  - **DeepSeek Math 7B** (LaTeX formula derivations & calculus)

### 4. Multimodal Problem Reading (Vision OCR) 📷
- Upload or directly paste (Ctrl+V) images of homework, textbook diagrams, and exam sheets.
- High-accuracy OCR extracts formulas, graphs, and questions.
- Step-by-step derivations with LaTeX notation and academic citations.

### 5. Cross-Device Account Sync (Cloudflare D1) 🔄
- Global user registration and authentication (First Name, Last Name, Email, Password).
- Each email is uniquely verified.
- **Strict User Isolation**: Accounts can only access their own conversation history.
- Entering credentials on any phone, tablet, or browser instantly pulls and syncs all conversation history.
- **Guest Mode**: Try without an account; chats stay temporary in-memory and clear on refresh.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/mehradbarzeh89-cell/nexora-ai-study.git
cd nexora-ai-study
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🌐 Cloudflare Deployment & Tunnel

To run 24/7 or expose via a Cloudflare Quick Tunnel:
```bash
# Run local dev server with API proxy
npm run dev -- --host --port 5173

# Start Cloudflare Tunnel
node start-tunnel.js
```

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas API (Orb visualizer).
- **Edge Backend**: Cloudflare Workers, Cloudflare D1 Database, Workers AI REST API.
- **Speech**: Web Audio API, Web Speech API (`SpeechRecognition`, `SpeechSynthesis`).
- **Typography & Formulas**: KaTeX math rendering, syntax highlighting.

---

## 📄 License
MIT © Nexora AI Study Assistant
