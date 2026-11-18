const $ = (id) => document.getElementById(id);
const input = $("userInput");
const conversation = $("conversation");
const welcome = $("welcome");
let language = "en";
let mode = "chat";
let busy = false;

const titles = {
  chat: "AI Chat", search: "Smart Search", research: "Deep Research",
  code: "Coding Assistant", learn: "Learning Assistant", write: "Writing Assistant"
};

function addMessage(text, who = "assistant", sources = []) {
  welcome.hidden = true;
  const row = document.createElement("div");
  row.className = `message ${who}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "Y" : "F";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  if (sources.length) {
    const sourceBox = document.createElement("div");
    sourceBox.className = "sources";
    const label = document.createElement("b");
    label.textContent = "WEB SOURCES";
    sourceBox.append(label);
    sources.forEach((source) => {
      const a = document.createElement("a");
      a.href = source.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = source.title;
      sourceBox.append(a);
    });
    bubble.append(sourceBox);
  }
  row.append(avatar, bubble);
  conversation.append(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return bubble;
}

function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "error" : "";
}

function setMode(next) {
  mode = next;
  $("modeTitle").textContent = titles[mode] || "AI Chat";
  document.querySelectorAll(".nav-item[data-mode]").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === mode));
  if (mode === "search" || mode === "research") $("webSearch").checked = true;
  $("sidebar").classList.remove("open");
}

async function runSearch(query, deep = false) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Search failed");
  if (!data.results?.length) return { text: "No search results were returned. Try different keywords.", sources: [] };
  const lines = data.results.map((r, i) =>
    `${i + 1}. ${r.title}\n${r.snippet || "Open the source for details."}`).join("\n\n");
  const intro = deep
    ? "Research results from the web are below. These are source snippets, not a fully verified report. Open the links to check details:\n\n"
    : "Here are the web search results:\n\n";
  return { text: intro + lines, sources: data.results };
}

async function sendMessage(prefill) {
  if (busy) return;
  const message = (prefill ?? input.value).trim();
  if (!message) return;
  input.value = "";
  input.style.height = "auto";
  addMessage(message, "user");
  const wantsSearch = $("webSearch").checked || mode === "search" || mode === "research";
  const deep = $("deepSearch").checked || mode === "research";
  const bubble = addMessage("Thinking…", "assistant");
  bubble.classList.add("typing");
  busy = true;
  $("sendBtn").disabled = true;
  setStatus(wantsSearch ? "Searching the web…" : "Preparing response…");

  try {
    if (wantsSearch) {
      const result = await runSearch(message, deep);
      bubble.classList.remove("typing");
      bubble.textContent = result.text;
      if (result.sources.length) {
        const sourceBox = document.createElement("div");
        sourceBox.className = "sources";
        const label = document.createElement("b");
        label.textContent = "SOURCES — " + result.sources.length;
        sourceBox.append(label);
        result.sources.forEach((source) => {
          const a = document.createElement("a");
          a.href = source.url; a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = source.title; sourceBox.append(a);
        });
        bubble.append(sourceBox);
      }
    } else {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed");
      bubble.classList.remove("typing");
      bubble.textContent = data.reply;
    }
    setStatus("Ready.");
  } catch (error) {
    bubble.classList.remove("typing");
    bubble.textContent = error.message || "Something went wrong. Please try again.";
    bubble.classList.add("error");
    setStatus("Request failed.", true);
  } finally {
    busy = false;
    $("sendBtn").disabled = false;
    input.focus();
  }
}

$("sendBtn").addEventListener("click", () => sendMessage());
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); sendMessage();
  }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});
$("newChat").addEventListener("click", () => {
  conversation.replaceChildren();
  welcome.hidden = false;
  input.value = "";
  setStatus("New chat started.");
});
$("clearHistory").addEventListener("click", () => {
  conversation.replaceChildren();
  welcome.hidden = false;
  setStatus("Chat cleared.");
});
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-item[data-mode]").forEach((b) =>
  b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll("[data-prompt]").forEach((b) =>
  b.addEventListener("click", () => sendMessage(b.dataset.prompt)));
$("languageBtn").addEventListener("click", () => {
  language = language === "en" ? "ta" : "en";
  $("languageLabel").textContent = language === "ta" ? "தமிழ்" : "English";
  setStatus(language === "ta" ? "Tamil response language selected." : "English response language selected.");
});
$("micBtn").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return setStatus("Voice input is not supported in this browser.", true);
  const recognition = new SpeechRecognition();
  recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
    input.focus();
  };
  recognition.onerror = () => setStatus("Voice input failed. Please try again.", true);
  recognition.start();
});
$("fileInput")?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) setStatus(`${file.name} selected. File analysis is not enabled in this starter build.`);
});
