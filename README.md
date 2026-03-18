# 🔐 CyberQuiz — Multiplayer Online

Quiz de ciberseguridad en tiempo real. Crea salas con código, hasta 20 jugadores por partida.

---

## ⚡ Instalación rápida

```bash
npm install
npm start
```
Abre http://localhost:3000 — listo.

---

## 🌐 Poner online (cuando quieras usarlo)

### Opción A — ngrok (recomendado para uso ocasional, GRATIS)

1. Descarga ngrok: https://ngrok.com/download
2. Con el servidor corriendo, en otra terminal:
   ```bash
   ngrok http 3000
   ```
3. ngrok te da una URL pública como:
   ```
   https://abc123.ngrok.io
   ```
4. Comparte esa URL — cualquier persona con internet puede jugar.
5. Cuando termines, Ctrl+C y la URL desaparece.

> 💡 Cuenta gratuita de ngrok = URL distinta cada vez que abres.
> Con cuenta paga (~$10/mes) puedes tener una URL fija.

---

### Opción B — Railway.app (hosting permanente, GRATIS tier)

1. Crea cuenta en https://railway.app
2. Sube el proyecto a GitHub
3. En Railway: New Project → Deploy from GitHub → selecciona el repo
4. Railway detecta package.json y despliega automáticamente.
5. Te da una URL permanente tipo: `https://cyberquiz-production.up.railway.app`

---

### Opción C — Render.com (también gratis)

1. Crea cuenta en https://render.com
2. New → Web Service → conecta tu repo de GitHub
3. Build Command: `npm install`
4. Start Command: `npm start`
5. URL permanente incluida.

---

## 🎮 Cómo funciona

| Quién | Acción |
|-------|--------|
| **Host** | Crea la sala, obtiene código de 4 letras |
| **Jugadores** | Ingresan el código + su nombre |
| **Host** | Presiona "Iniciar Juego" cuando todos estén listos |
| **Todos** | Responden las mismas preguntas al mismo tiempo |
| **Auto** | El servidor maneja el timer y avanza preguntas |
| **Final** | Podio + ranking completo con barras de progreso |

---

## 🛠 Personalizar

**Cambiar tiempo por pregunta** → `server.js` línea:
```js
const TIME_PER_Q = 12; // segundos
```

**Agregar preguntas** → Array `QUESTIONS` en `server.js`
```js
{ q: "¿Pregunta?", opts: ["A","B","C","D"], ans: 2, cat: "🔴 CATEGORÍA" }
```

**Cambiar puerto** → Variable de entorno `PORT` o editar línea final de `server.js`

---

## 📦 Stack

- **Backend:** Node.js + Express + Socket.io
- **Frontend:** HTML/CSS/JS vanilla (sin dependencias de frontend)
- **Estado:** En memoria (no necesita base de datos)
- **Tiempo real:** WebSockets via Socket.io

---

## 📁 Estructura

```
cyberquiz/
├── server.js          ← Lógica del servidor + salas
├── package.json
├── public/
│   └── index.html     ← Cliente completo (host + jugadores)
└── README.md
```
