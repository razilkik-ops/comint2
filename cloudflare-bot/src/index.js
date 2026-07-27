import catalog from "./catalog.js";

const STATUS_LABELS = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};

const STATUS_BUTTONS = [
  ["in_progress", "Взять в работу"],
  ["done", "Выполнено"],
  ["cancelled", "Отменить"],
];

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "Каталог услуг", callback_data: "catalog" },
      { text: "Описать задачу", callback_data: "describe" },
    ],
    [
      { text: "Мои заявки", callback_data: "orders" },
      { text: "Позвать менеджера", callback_data: "manager" },
    ],
  ],
};

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: "Отправить телефон", request_contact: true }], [{ text: "Пропустить" }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

function now() {
  return new Date().toISOString();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function truncate(value, length = 48) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
}

function createOrderId() {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = crypto.randomUUID().split("-")[0].toUpperCase();
  return `C-${stamp}-${suffix}`;
}

function getTelegramUser(update) {
  return update.message?.from || update.callback_query?.from || update.callback_query?.message?.chat;
}

function getChatId(update) {
  return update.message?.chat?.id || update.callback_query?.message?.chat?.id;
}

function getManagerIds(env) {
  return String(env.MANAGER_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function telegram(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(`Telegram ${method} failed: ${result.description || response.status}`);
  }

  return result.result;
}

async function sendMessage(env, chatId, text, replyMarkup) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editMessage(env, chatId, messageId, text, replyMarkup) {
  return telegram(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function renderCallbackScreen(env, callback, text, replyMarkup) {
  const message = callback.message;
  try {
    await editMessage(env, message.chat.id, message.message_id, text, replyMarkup);
  } catch (error) {
    if (!String(error.message).includes("message is not modified")) {
      throw error;
    }
  }
}

async function answerCallback(env, callback, text = "") {
  await telegram(env, "answerCallbackQuery", {
    callback_query_id: callback.id,
    ...(text ? { text } : {}),
  });
}

async function getSession(env, telegramUserId) {
  return env.DB.prepare("SELECT * FROM sessions WHERE telegram_user_id = ?")
    .bind(String(telegramUserId))
    .first();
}

async function saveSession(env, telegramUserId, chatId, state, draft) {
  await env.DB.prepare(
    `INSERT INTO sessions (telegram_user_id, chat_id, state, draft_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(telegram_user_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       state = excluded.state,
       draft_json = excluded.draft_json,
       updated_at = excluded.updated_at`,
  )
    .bind(String(telegramUserId), String(chatId), state, JSON.stringify(draft || {}), now())
    .run();
}

async function resetSession(env, telegramUserId, chatId) {
  await saveSession(env, telegramUserId, chatId, "idle", {});
}

function menuText(user) {
  const firstName = user?.first_name ? `, ${escapeHtml(user.first_name)}` : "";
  return `Здравствуйте${firstName}!\n\nЯ помогу выбрать услугу COMINT, собрать параметры заказа и передать заявку менеджеру.`;
}

async function showMainMenu(env, chatId, user, callback) {
  const text = menuText(user);
  if (callback) {
    await renderCallbackScreen(env, callback, text, MAIN_KEYBOARD);
  } else {
    await sendMessage(env, chatId, text, MAIN_KEYBOARD);
  }
}

function getKinds() {
  return [
    ["souvenirs", "Сувенирная продукция"],
    ["print", "Полиграфия и реклама"],
  ];
}

function getSections(kind) {
  return [...new Set(catalog.filter((item) => item.kind === kind).map((item) => item.section))];
}

function getServices(kind, section) {
  return catalog.filter((item) => item.kind === kind && item.section === section);
}

async function showKinds(env, chatId, callback) {
  const keyboard = getKinds().map(([kind, label]) => [{ text: label, callback_data: `kind:${kind}` }]);
  keyboard.push([{ text: "Назад", callback_data: "menu" }]);
  const text = "Выберите направление:";
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: keyboard });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: keyboard });
  }
}

async function showSections(env, chatId, kind, callback) {
  const sections = getSections(kind);
  const keyboard = sections.map((section, index) => [
    { text: truncate(section, 58), callback_data: `section:${kind}:${index}` },
  ]);
  keyboard.push([{ text: "Назад", callback_data: "catalog" }]);
  const text = "Выберите категорию услуг:";
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: keyboard });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: keyboard });
  }
}

async function showServices(env, chatId, kind, sectionIndex, page = 0, callback) {
  const sections = getSections(kind);
  const section = sections[sectionIndex];
  const services = getServices(kind, section);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
  const currentPage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);
  const start = currentPage * pageSize;
  const keyboard = services.slice(start, start + pageSize).map((service) => {
    const catalogIndex = catalog.indexOf(service);
    return [{ text: truncate(service.title), callback_data: `service:${catalogIndex}` }];
  });

  const navigation = [];
  if (currentPage > 0) {
    navigation.push({ text: "‹", callback_data: `services:${kind}:${sectionIndex}:${currentPage - 1}` });
  }
  navigation.push({ text: `${currentPage + 1}/${totalPages}`, callback_data: "noop" });
  if (currentPage < totalPages - 1) {
    navigation.push({ text: "›", callback_data: `services:${kind}:${sectionIndex}:${currentPage + 1}` });
  }
  if (navigation.length) {
    keyboard.push(navigation);
  }
  keyboard.push([{ text: "Назад", callback_data: `kind:${kind}` }]);

  const text = `<b>${escapeHtml(section)}</b>\nВыберите услугу:`;
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: keyboard });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: keyboard });
  }
}

async function askForQuantity(env, chatId, userId, draft, callback) {
  await saveSession(env, userId, chatId, "awaiting_quantity", draft);
  const text = `<b>${escapeHtml(draft.service || "Ваша задача")}</b>\n\nУкажите размер тиража или количество. Можно написать, например: <b>500 шт</b> или <b>около 1000</b>.`;
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: [[{ text: "Отмена", callback_data: "cancel" }]] });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: [[{ text: "Отмена", callback_data: "cancel" }]] });
  }
}

async function askForDescription(env, chatId, userId, callback) {
  await saveSession(env, userId, chatId, "awaiting_description", {});
  const text = "Опишите задачу своими словами: что нужно изготовить, для чего и какие есть пожелания?";
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: [[{ text: "Отмена", callback_data: "cancel" }]] });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: [[{ text: "Отмена", callback_data: "cancel" }]] });
  }
}

async function askForFile(env, chatId, userId, draft) {
  await saveSession(env, userId, chatId, "awaiting_file", draft);
  await sendMessage(env, chatId, "Прикрепите макет или пример файлом. Если файла нет, нажмите «Пропустить файл».", {
    inline_keyboard: [[{ text: "Пропустить файл", callback_data: "skip_file" }], [{ text: "Отмена", callback_data: "cancel" }]],
  });
}

async function askForContact(env, chatId, userId, draft) {
  await saveSession(env, userId, chatId, "awaiting_contact", draft);
  await sendMessage(env, chatId, "Оставьте номер телефона, чтобы менеджер мог быстро связаться с вами. Это необязательно.", CONTACT_KEYBOARD);
}

function draftSummary(draft) {
  const lines = [
    `<b>Услуга:</b> ${escapeHtml(draft.service || "Индивидуальная задача")}`,
    draft.section ? `<b>Категория:</b> ${escapeHtml(draft.section)}` : "",
    draft.quantity ? `<b>Количество:</b> ${escapeHtml(draft.quantity)}` : "",
    draft.description ? `<b>Описание:</b> ${escapeHtml(draft.description)}` : "",
    draft.fileName ? `<b>Файл:</b> ${escapeHtml(draft.fileName)}` : "<b>Файл:</b> не прикреплён",
    draft.phone ? `<b>Телефон:</b> ${escapeHtml(draft.phone)}` : "<b>Телефон:</b> не указан",
  ];
  return lines.filter(Boolean).join("\n");
}

async function showConfirmation(env, chatId, userId, draft) {
  await saveSession(env, userId, chatId, "awaiting_confirmation", draft);
  await sendMessage(env, chatId, " ", { remove_keyboard: true });
  await sendMessage(env, chatId, `<b>Проверьте заявку</b>\n\n${draftSummary(draft)}`, {
    inline_keyboard: [
      [{ text: "Оформить заявку", callback_data: "confirm" }],
      [{ text: "Начать заново", callback_data: "cancel" }],
    ],
  });
}

async function storeTelegramFile(env, fileId, fileName, orderId) {
  if (!env.UPLOADS) {
    return "";
  }

  const file = await telegram(env, "getFile", { file_id: fileId });
  if (!file?.file_path) {
    return "";
  }

  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) {
    return "";
  }

  const safeName = String(fileName || "file").replace(/[^a-zA-Z0-9а-яА-Я._-]/g, "_");
  const key = `orders/${orderId}/${safeName}`;
  await env.UPLOADS.put(key, await response.arrayBuffer(), {
    httpMetadata: { contentType: response.headers.get("content-type") || "application/octet-stream" },
  });
  return key;
}

async function createOrder(env, update, draft) {
  const user = getTelegramUser(update) || {};
  const chatId = getChatId(update);
  const publicId = createOrderId();
  const fileKey = draft.fileId ? await storeTelegramFile(env, draft.fileId, draft.fileName, publicId).catch(() => "") : "";
  const createdAt = now();

  await env.DB.prepare(
    `INSERT INTO orders (
      public_id, telegram_user_id, chat_id, username, customer_name, phone,
      kind, section, service, description, quantity, file_key, file_name,
      telegram_file_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
  )
    .bind(
      publicId,
      String(user.id),
      String(chatId),
      user.username ? `@${user.username}` : "",
      [user.first_name, user.last_name].filter(Boolean).join(" "),
      draft.phone || "",
      draft.kind || "",
      draft.section || "",
      draft.service || "Индивидуальная задача",
      draft.description || "",
      Number.parseInt(String(draft.quantity || "0"), 10) || 0,
      fileKey,
      draft.fileName || "",
      draft.fileId || "",
      createdAt,
      createdAt,
    )
    .run();

  const managerText = [
    `<b>Новая заявка из бота #${escapeHtml(publicId)}</b>`,
    "",
    `<b>Клиент:</b> ${escapeHtml([user.first_name, user.last_name].filter(Boolean).join(" ") || "не указано")} ${escapeHtml(user.username ? `(@${user.username})` : "")}`,
    `<b>Telegram ID:</b> <code>${escapeHtml(user.id)}</code>`,
    `<b>Телефон:</b> ${escapeHtml(draft.phone || "не указан")}`,
    draftSummary(draft),
  ].join("\n");

  await sendMessage(env, env.MANAGER_CHAT_ID, managerText, {
    inline_keyboard: STATUS_BUTTONS.map(([status, label]) => [{ text: label, callback_data: `status:${publicId}:${status}` }]),
  });

  if (draft.fileId) {
    await telegram(env, "sendDocument", {
      chat_id: env.MANAGER_CHAT_ID,
      document: draft.fileId,
      caption: `Файл к заявке ${publicId}${fileKey ? " (сохранён в R2)" : ""}`,
    });
  }

  return publicId;
}

async function finishOrder(env, update, userId, draft) {
  const chatId = getChatId(update);
  const publicId = await createOrder(env, update, draft);
  await resetSession(env, userId, chatId);
  await sendMessage(env, chatId, `Заявка <b>${escapeHtml(publicId)}</b> отправлена менеджеру.\n\nПосмотреть её статус можно в разделе «Мои заявки».`, MAIN_KEYBOARD);
}

async function showOrders(env, chatId, userId, callback) {
  const result = await env.DB.prepare(
    `SELECT public_id, service, quantity, status, created_at
     FROM orders WHERE telegram_user_id = ? ORDER BY created_at DESC LIMIT 10`,
  )
    .bind(String(userId))
    .all();
  const rows = result.results || [];
  const text = rows.length
    ? `<b>Ваши заявки</b>\n\n${rows.map((order) => {
        const date = new Date(order.created_at).toLocaleDateString("ru-RU");
        const quantity = order.quantity ? `, ${order.quantity} шт` : "";
        return `<b>${escapeHtml(order.public_id)}</b> — ${escapeHtml(order.service)}${quantity}\nСтатус: <b>${STATUS_LABELS[order.status] || order.status}</b>, ${date}`;
      }).join("\n\n")}`
    : "У вас пока нет заявок. Выберите услугу или опишите задачу, чтобы начать.";
  if (callback) {
    await renderCallbackScreen(env, callback, text, { inline_keyboard: [[{ text: "В меню", callback_data: "menu" }]] });
  } else {
    await sendMessage(env, chatId, text, { inline_keyboard: [[{ text: "В меню", callback_data: "menu" }]] });
  }
}

async function requestManager(env, update, userId) {
  const chatId = getChatId(update);
  const user = getTelegramUser(update) || {};
  await env.DB.prepare(
    `INSERT INTO orders (
      public_id, telegram_user_id, chat_id, username, customer_name, service,
      status, manager_requested, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'Запрос менеджера', 'new', 1, ?, ?)`,
  )
    .bind(
      createOrderId(),
      String(userId),
      String(chatId),
      user.username ? `@${user.username}` : "",
      [user.first_name, user.last_name].filter(Boolean).join(" "),
      now(),
      now(),
    )
    .run();
  await sendMessage(env, env.MANAGER_CHAT_ID, `<b>Клиент просит менеджера</b>\nTelegram ID: <code>${escapeHtml(userId)}</code>\nИмя: ${escapeHtml(user.first_name || "не указано")}`);
  await sendMessage(env, chatId, "Запрос передан менеджеру. Он свяжется с вами в Telegram или по телефону.", MAIN_KEYBOARD);
}

async function updateOrderStatus(env, callback, publicId, status) {
  const userId = String(callback.from?.id || "");
  if (!getManagerIds(env).includes(userId)) {
    await answerCallback(env, callback, "Недостаточно прав");
    return;
  }

  const order = await env.DB.prepare("SELECT * FROM orders WHERE public_id = ?").bind(publicId).first();
  if (!order) {
    await answerCallback(env, callback, "Заявка не найдена");
    return;
  }

  await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE public_id = ?")
    .bind(status, now(), publicId)
    .run();

  await sendMessage(env, order.chat_id, `Статус заявки <b>${escapeHtml(publicId)}</b> изменён: <b>${STATUS_LABELS[status] || status}</b>.`, MAIN_KEYBOARD);
  await renderCallbackScreen(env, callback, `${callback.message?.text || ""}\n\n<b>Статус изменён:</b> ${STATUS_LABELS[status] || status}`, {
    inline_keyboard: STATUS_BUTTONS.map(([nextStatus, label]) => [{ text: label, callback_data: `status:${publicId}:${nextStatus}` }]),
  });
}

async function handleCallback(env, callback) {
  const chatId = callback.message?.chat?.id;
  const userId = callback.from?.id;
  const data = callback.data || "";
  await answerCallback(env, callback);

  if (data === "noop") {
    return;
  }
  if (data === "menu") {
    await resetSession(env, userId, chatId);
    await showMainMenu(env, chatId, callback.from, callback);
    return;
  }
  if (data === "catalog") {
    await showKinds(env, chatId, callback);
    return;
  }
  if (data === "describe") {
    await askForDescription(env, chatId, userId, callback);
    return;
  }
  if (data === "orders") {
    await showOrders(env, chatId, userId, callback);
    return;
  }
  if (data === "manager") {
    await requestManager(env, callback, userId);
    return;
  }
  if (data === "cancel") {
    await resetSession(env, userId, chatId);
    await renderCallbackScreen(env, callback, "Заявка отменена. Что хотите сделать дальше?", MAIN_KEYBOARD);
    return;
  }
  if (data === "skip_file") {
    const session = await getSession(env, userId);
    const draft = parseJson(session?.draft_json);
    await askForContact(env, chatId, userId, draft);
    return;
  }
  if (data === "confirm") {
    const session = await getSession(env, userId);
    const draft = parseJson(session?.draft_json);
    await finishOrder(env, callback, userId, draft);
    return;
  }
  if (data.startsWith("status:")) {
    const [, publicId, status] = data.split(":");
    await updateOrderStatus(env, callback, publicId, status);
    return;
  }
  if (data.startsWith("kind:")) {
    await showSections(env, chatId, data.slice(5), callback);
    return;
  }
  if (data.startsWith("section:")) {
    const [, kind, sectionIndex] = data.split(":");
    await showServices(env, chatId, kind, Number(sectionIndex), 0, callback);
    return;
  }
  if (data.startsWith("services:")) {
    const [, kind, sectionIndex, page] = data.split(":");
    await showServices(env, chatId, kind, Number(sectionIndex), Number(page), callback);
    return;
  }
  if (data.startsWith("service:")) {
    const service = catalog[Number(data.slice(8))];
    if (!service) {
      await sendMessage(env, chatId, "Услуга не найдена. Попробуйте открыть каталог заново.", MAIN_KEYBOARD);
      return;
    }
    await askForQuantity(env, chatId, userId, {
      kind: service.kind,
      section: service.section,
      service: service.title,
      description: "",
    }, callback);
  }
}

async function handleFile(env, message, session) {
  const fileId = message.document?.file_id || message.photo?.at(-1)?.file_id;
  if (!fileId || !session) {
    return false;
  }

  if (session.state !== "awaiting_file") {
    return false;
  }

  const draft = parseJson(session.draft_json);
  draft.fileId = fileId;
  draft.fileName = message.document?.file_name || `photo-${Date.now()}.jpg`;
  await askForContact(env, message.chat.id, message.from.id, draft);
  return true;
}

async function handleText(env, message, session) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = String(message.text || "").trim();

  if (text === "/start" || text === "/menu") {
    await resetSession(env, userId, chatId);
    await showMainMenu(env, chatId, message.from);
    return;
  }
  if (text === "Каталог услуг") {
    await showKinds(env, chatId);
    return;
  }
  if (text === "Описать задачу") {
    await askForDescription(env, chatId, userId);
    return;
  }
  if (text === "Мои заявки") {
    await showOrders(env, chatId, userId);
    return;
  }
  if (text === "Позвать менеджера") {
    await requestManager(env, { message }, userId);
    return;
  }

  if (session?.state === "awaiting_description") {
    await askForQuantity(env, chatId, userId, { description: text, service: "Индивидуальная задача" });
    return;
  }

  if (session?.state === "awaiting_quantity") {
    const quantity = Number.parseInt(text.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      await sendMessage(env, chatId, "Не смог распознать количество. Напишите число, например: 500.");
      return;
    }
    const draft = parseJson(session.draft_json);
    draft.quantity = quantity;
    await askForFile(env, chatId, userId, draft);
    return;
  }

  if (session?.state === "awaiting_contact") {
    const draft = parseJson(session.draft_json);
    if (text.toLowerCase() !== "пропустить") {
      draft.phone = text;
    }
    await showConfirmation(env, chatId, userId, draft);
    return;
  }

  await sendMessage(env, chatId, "Выберите действие в меню или напишите /start.", MAIN_KEYBOARD);
}

async function handleUpdate(env, update) {
  if (update.callback_query) {
    await handleCallback(env, update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.chat?.id || !message.from?.id) {
    return;
  }

  const session = await getSession(env, message.from.id);
  if (message.document || message.photo) {
    if (await handleFile(env, message, session)) {
      return;
    }
  }
  if (message.contact && session?.state === "awaiting_contact") {
    const draft = parseJson(session.draft_json);
    draft.phone = message.contact.phone_number || "";
    await showConfirmation(env, message.chat.id, message.from.id, draft);
    return;
  }
  if (message.text) {
    await handleText(env, message, session);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "comint-autosales-bot" });
    }

    if (url.pathname !== "/telegram/webhook" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const expectedSecret = String(env.WEBHOOK_SECRET || "");
    const receivedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await request.json();
    ctx.waitUntil(handleUpdate(env, update).catch((error) => console.error(error)));
    return Response.json({ ok: true });
  },
};
