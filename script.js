const STORAGE_KEY = "miguel_platform_preview_conversations";
const ACTIVE_KEY = "miguel_platform_preview_active_id";

const platformForm = document.getElementById("miguelPlatformChatForm");
const platformInput = document.getElementById("miguelPlatformInput");
const platformMessages = document.getElementById("miguelPlatformMessages");
const platformSend = document.getElementById("miguelPlatformSend");
const conversationList = document.getElementById("conversationList");
const conversationType = document.getElementById("conversationType");
const newConversationButton = document.getElementById("newConversationButton");
const activeConversationTitle = document.getElementById("activeConversationTitle");
const activeConversationMeta = document.getElementById("activeConversationMeta");
const activeConversationType = document.getElementById("activeConversationType");

const conversationTypes = {
  casual: {
    label: "Conversa casual",
    shortLabel: "Casual",
    starter:
      "Oi. Este chat é para conversa casual em modo prévia. Ainda sou uma simulação local, mas já dá para testar a experiência."
  },
  finance: {
    label: "Finanças",
    shortLabel: "Finanças",
    starter:
      "Este chat foi separado para finanças. Quando o MIGUEL Core for conectado, esse tipo de conversa vai precisar de limites, contexto e cuidado extra."
  },
  project: {
    label: "Projeto",
    shortLabel: "Projeto",
    starter:
      "Este chat é para projetos. Aqui a interface já começa a testar conversas mais organizadas por assunto."
  },
  memory: {
    label: "Memória",
    shortLabel: "Memória",
    starter:
      "Este chat é para assuntos de memória. A regra continua: cada pessoa e cada conversa precisam respeitar fronteiras claras."
  }
};

let conversations = [];
let activeConversationId = "";
let previewSending = false;

function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `conversation_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatTime(isoDate) {
  const date = new Date(isoDate);

  if (!Number.isFinite(date.getTime())) {
    return "agora";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function getTypeConfig(type) {
  return conversationTypes[type] || conversationTypes.casual;
}

function createConversation(type = "casual") {
  const config = getTypeConfig(type);
  const createdAt = nowIso();

  return {
    id: createId(),
    title: config.label,
    type,
    createdAt,
    updatedAt: createdAt,
    messages: [
      {
        id: createId(),
        role: "miguel",
        text: config.starter,
        createdAt
      }
    ]
  };
}

function loadConversations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    conversations = Array.isArray(parsed)
      ? parsed.filter(item => item?.id && Array.isArray(item.messages))
      : [];
  } catch {
    conversations = [];
  }

  if (!conversations.length) {
    conversations = [
      createConversation("casual"),
      createConversation("finance")
    ];
  }

  activeConversationId =
    localStorage.getItem(ACTIVE_KEY) ||
    conversations[0]?.id ||
    "";

  if (!getActiveConversation()) {
    activeConversationId = conversations[0]?.id || "";
  }
}

function saveConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  localStorage.setItem(ACTIVE_KEY, activeConversationId);
}

function getActiveConversation() {
  return conversations.find(item => item.id === activeConversationId) || null;
}

function inferTitleFromMessage(message) {
  const cleaned = String(message || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.length > 34
    ? `${cleaned.slice(0, 31).trim()}...`
    : cleaned;
}

function scrollPlatformChat() {
  if (!platformMessages) return;

  platformMessages.scrollTop = platformMessages.scrollHeight;
}

function createPreviewMessage({ from, text, typing = false }) {
  const article = document.createElement("article");
  const bubble = document.createElement("div");
  const author = document.createElement("span");
  const paragraph = document.createElement("p");

  article.className = from === "user"
    ? "preview-message user"
    : "preview-message miguel";

  if (from === "miguel") {
    const avatar = document.createElement("div");
    const image = document.createElement("img");

    avatar.className = "preview-avatar";
    image.src = "assets/miguel-logo.png";
    image.alt = "";
    avatar.appendChild(image);
    article.appendChild(avatar);
  }

  author.textContent = from === "user" ? "Você" : "MIGUEL";
  paragraph.textContent = text;

  if (typing) {
    article.dataset.typing = "true";
    paragraph.className = "typing-dots";
    paragraph.textContent = "MIGUEL está pensando";
  }

  bubble.appendChild(author);
  bubble.appendChild(paragraph);
  article.appendChild(bubble);

  return article;
}

function renderConversationList() {
  if (!conversationList) return;

  conversationList.replaceChildren();

  conversations
    .slice()
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .forEach(conversation => {
      const button = document.createElement("button");
      const title = document.createElement("span");
      const meta = document.createElement("small");
      const config = getTypeConfig(conversation.type);

      button.type = "button";
      button.className = conversation.id === activeConversationId
        ? "conversation-item active"
        : "conversation-item";
      button.dataset.conversationId = conversation.id;

      title.textContent = conversation.title || config.label;
      meta.textContent = `${config.shortLabel} • ${formatTime(conversation.updatedAt)}`;

      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", () => {
        activeConversationId = conversation.id;
        saveConversations();
        renderApp();
      });

      conversationList.appendChild(button);
    });
}

function renderMessages() {
  if (!platformMessages) return;

  const conversation = getActiveConversation();

  platformMessages.replaceChildren();

  if (!conversation) {
    return;
  }

  conversation.messages.forEach(message => {
    platformMessages.appendChild(
      createPreviewMessage({
        from: message.role === "user" ? "user" : "miguel",
        text: message.text
      })
    );
  });

  scrollPlatformChat();
}

function renderHeader() {
  const conversation = getActiveConversation();

  if (!conversation) return;

  const config = getTypeConfig(conversation.type);

  if (activeConversationTitle) {
    activeConversationTitle.textContent = conversation.title || config.label;
  }

  if (activeConversationMeta) {
    activeConversationMeta.textContent =
      `${config.label} • prévia local • ${conversation.messages.length} mensagens`;
  }

  if (activeConversationType) {
    activeConversationType.textContent =
      conversation.type === "finance"
        ? "Finanças isoladas"
        : "Memória isolada";
  }
}

function renderApp() {
  renderConversationList();
  renderHeader();
  renderMessages();
}

function setPreviewSending(active) {
  previewSending = active;

  if (platformSend) {
    platformSend.disabled = active;
    platformSend.textContent = active ? "..." : "Enviar";
  }

  if (platformInput) {
    platformInput.disabled = active;
  }
}

function nextPreviewReply(userText, conversation) {
  const normalized = String(userText || "").toLowerCase();
  const type = conversation?.type || "casual";

  if (type === "finance") {
    return "Boa. Este chat está marcado como finanças. Quando o backend entrar, ele deve tratar esse contexto separado e com cuidado maior, sem misturar com conversa casual.";
  }

  if (type === "project") {
    return "Esse assunto fica bem em um chat de projeto. A separação ajuda o MIGUEL a manter foco sem puxar tudo para uma conversa única.";
  }

  if (
    normalized.includes("memoria") ||
    normalized.includes("memória") ||
    normalized.includes("lucas")
  ) {
    return "Exato: memória é o centro. A Platform precisa guardar contexto por usuário e por conversa, sem atravessar a história íntima do Lucas.";
  }

  if (
    normalized.includes("bug") ||
    normalized.includes("teste") ||
    normalized.includes("interface")
  ) {
    return "Perfeito para esta fase. Aqui testamos fluxo, troca entre conversas, responsividade e estados visuais antes de conectar o MIGUEL Core.";
  }

  return "Entendi. Em modo prévia, eu ainda respondo localmente, mas essa conversa já está sendo guardada como um chat separado neste navegador.";
}

function autoResizePlatformInput() {
  if (!platformInput) return;

  platformInput.style.height = "auto";
  platformInput.style.height = `${Math.min(platformInput.scrollHeight, 132)}px`;
}

function addMessageToConversation(conversation, role, text) {
  conversation.messages.push({
    id: createId(),
    role,
    text,
    createdAt: nowIso()
  });
  conversation.updatedAt = nowIso();
}

async function submitPlatformPreview(event) {
  event.preventDefault();

  if (!platformInput || previewSending) return;

  const conversation = getActiveConversation();
  const userText = platformInput.value.trim();

  if (!conversation || !userText) return;

  addMessageToConversation(conversation, "user", userText);

  if (
    conversation.messages.filter(message => message.role === "user").length === 1
  ) {
    conversation.title = inferTitleFromMessage(userText) || conversation.title;
  }

  platformInput.value = "";
  autoResizePlatformInput();
  saveConversations();
  renderApp();
  setPreviewSending(true);

  const typingMessage = createPreviewMessage({
    from: "miguel",
    text: "",
    typing: true
  });

  platformMessages.appendChild(typingMessage);
  scrollPlatformChat();

  window.setTimeout(() => {
    typingMessage.remove();
    addMessageToConversation(
      conversation,
      "miguel",
      nextPreviewReply(userText, conversation)
    );
    saveConversations();
    renderApp();
    setPreviewSending(false);
    platformInput.focus();
  }, 650);
}

function handlePlatformKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  event.preventDefault();
  platformForm?.requestSubmit();
}

function createNewConversation() {
  const type = conversationType?.value || "casual";
  const conversation = createConversation(type);

  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  saveConversations();
  renderApp();
  platformInput?.focus();
}

loadConversations();
renderApp();

platformForm?.addEventListener("submit", submitPlatformPreview);
platformInput?.addEventListener("input", autoResizePlatformInput);
platformInput?.addEventListener("keydown", handlePlatformKeydown);
newConversationButton?.addEventListener("click", createNewConversation);
