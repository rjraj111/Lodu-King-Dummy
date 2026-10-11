# 👑 Ludo King — Pixel-Perfect Web Clone with Stealth Biased RNG & Remote Smartphone Controller

A complete, production-ready, highly realistic web-based Ludo game that visually and functionally mirrors **Ludo King**.

Featuring:
1. **Pixel-Perfect Ludo King Visuals**: Authentic 15x15 board with rich wood grain border, exact colors (`#E52521`, `#009E49`, `#FFC20E`, `#0072CE`), 8 star safe tiles, 3D typography ("Lilita One"), 3D tumbling dice cubes, and squash-and-stretch hopping tokens.
2. **Procedural Web Audio API Sound**: Dice rattling, melodic token hopping, celestial safe tile chimes, opponent capture explosions, and victory fanfare synthesized purely client-side.
3. **On-Screen Stealth Winner Trigger**: Zero UI visible during normal view. Directional tap matrix on the center "Ludo King" logo with an imperceptible 0.1s crown flash and haptic vibration feedback.
4. **Remote Mobile Controller (`controller.html`)**: Real-time cross-device communication via lightweight public MQTT over WebSockets (`wss://broker.hivemq.com:8884/mqtt`) or local BroadcastChannel. Allows setting favored winner, overriding dice rolls [1-6], triggering auto-kill distance, and disguising the screen as a working iOS-style Calculator app.
5. **Smart Biased RNG & Anti-Detection Engine**: Mathematically skews decisive turns (capture bias, evasion shielding, base escape assistance, and home alignment) while maintaining natural roll distributions and blocking 3 consecutive 6s penalties.

---

## 📁 Project Structure

```
├── index.html          # Main Ludo King game canvas & UI
├── controller.html     # Discreet smartphone remote controller
├── style.css           # Authentic Ludo King styling, boards, dice & animations
├── js/
│   ├── engine.js       # Core game state, 15x15 coordinate mapping, AI & turns
│   ├── diceEngine.js   # Stealth biased RNG engine & remote override queue
│   ├── sync.js         # Real-time WebSocket/MQTT sync manager
│   └── audio.js        # Procedural Web Audio API sound synthesizer
└── README.md           # Documentation & instructions
```

---

## 🕹️ Controls & Gameplay

### How to Play
1. Open `index.html` in any modern web browser or host on GitHub Pages.
2. Player 1 is Red (Human); Green, Yellow, and Blue are controlled by the smart AI engine.
3. Click your player's 3D dice when it's your turn to roll.
4. Tokens with legal moves will pulse and bounce. Click any valid token to execute the hop animation!

### 🕵️ On-Screen Stealth Winner Trigger
Tap the center **"Ludo King"** logo:
- **Tap Top**: Green is set as Favored Winner
- **Tap Right**: Yellow is set as Favored Winner
- **Tap Bottom**: Blue is set as Favored Winner
- **Tap Left**: Red is set as Favored Winner
- **Triple Tap Center**: Reset to Fair / Random mode
- *Feedback*: Imperceptible 0.1s flash of the crown icon + mobile haptic vibration (`navigator.vibrate(30)`).

### 📱 Remote Smartphone Controller (`controller.html`)
1. Click the **📱** button or **ROOM: LKXXXX** badge in the top bar of `index.html` to view the room code and QR link.
2. Open `controller.html?room=LKXXXX` on your second smartphone or another tab.
3. **Features**:
   - **Live Turn Monitor**: Shows whose turn it is in real-time.
   - **Guaranteed Winner Switch**: Instant buttons to switch the favored winner anytime (`Red`, `Green`, `Yellow`, `Blue`, `Fair`).
   - **Next Roll Force Grid**: Instant buttons `[1] [2] [3] [4] [5] [6]`. Tapping any button queues that exact number for the very next roll on the main board!
   - **🎯 Auto-Kill Mode**: Automatically calculates the exact distance needed to capture an opponent token.
   - **🧮 Calculator Disguise**: Tap "Disguise" to transform the remote into a working calculator. Triple-tap the calculator display to return to the controller!

---

## 🧠 Stealth Biased RNG Engine

- **Natural Pace**: Preserves uniform-looking dice distributions so rolls appear 100% natural to human players.
- **Capture Bias (75% probability)**: When the favored player has a token within 1-6 spaces of an opponent's vulnerable token, awards the capture roll with 75% probability.
- **Evasion Shield**: Actively calculates lethal distances from pursuers and excludes those numbers from opponents' rolls.
- **Base Escape**: If all favored tokens are in base, guarantees a 6 within 2-3 rolls.
- **Home Alignment**: Prevents favored tokens from bouncing back; awards exact finishing numbers.
- **Anti-Streak Protection**: Blocks 3 consecutive 6s to prevent the turn penalty rule.

---

## 🚀 Deployment

The project is 100% client-side with zero build steps or server dependencies required.
Simply push to GitHub and enable **GitHub Pages** from your repository settings!
