type RewriteAction = "fix_grammar" | "professional" | "casual" | "shorter" | "clearer";

declare const chrome: {
  storage: {
    local: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

interface ActionOption {
  action: RewriteAction;
  icon: IconName;
  label: string;
}

type IconName = "briefcase" | "check" | "compress" | "expand" | "message" | "sparkles" | "wand";

interface InputSelection {
  kind: "input";
  element: HTMLInputElement | HTMLTextAreaElement;
  start: number;
  end: number;
  text: string;
}

interface EditableSelection {
  kind: "contenteditable";
  element: HTMLElement;
  range: Range;
  text: string;
}

type StoredSelection = InputSelection | EditableSelection;

const API_URL = "https://chayansd.pro.bd/api/v1/rewrites";
const AUTO_REWRITE_DELAY_MS = 650;
const INSTALL_ID_KEY = "fixlyInstallId";
const MIN_SELECTION_LENGTH = 3;
const POPUP_MARGIN = 10;
const ACTIONS: ActionOption[] = [
  { action: "fix_grammar", icon: "check", label: "Fix grammar" },
  { action: "professional", icon: "briefcase", label: "Make professional" },
  { action: "casual", icon: "message", label: "Make casual" },
  { action: "shorter", icon: "compress", label: "Make shorter" },
  { action: "clearer", icon: "sparkles", label: "Make clearer" }
];

let popup: HTMLDivElement | null = null;
let storedSelection: StoredSelection | null = null;
let autoRewriteTimer: number | undefined;
let fallbackInstallId: string | null = null;
let hideTimer: number | undefined;
let isRewriting = false;
let lastAutoRewriteKey = "";

function createPopup() {
  const panel = document.createElement("div");
  panel.className = "fixly-ai-popup";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "AI rewrite actions");

  const header = document.createElement("div");
  header.className = "fixly-ai-popup__header";

  const brand = document.createElement("div");
  brand.className = "fixly-ai-popup__brand";

  const brandIcon = document.createElement("span");
  brandIcon.className = "fixly-ai-popup__brand-icon";
  brandIcon.append(createIcon("wand"));

  const spark = document.createElement("span");
  spark.className = "fixly-ai-popup__spark";
  spark.append(createIcon("expand"));

  const title = document.createElement("span");
  title.textContent = "Fixly";

  brand.append(brandIcon, title);
  header.append(brand, spark);

  const actions = document.createElement("div");
  actions.className = "fixly-ai-popup__actions";

  for (const option of ACTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fixly-ai-popup__button";
    button.append(createIcon(option.icon), document.createTextNode(option.label));
    button.addEventListener("click", () => void rewriteSelection(option.action));
    actions.append(button);
  }

  const custom = document.createElement("form");
  custom.className = "fixly-ai-popup__custom";

  const customInput = document.createElement("textarea");
  customInput.className = "fixly-ai-popup__input";
  customInput.maxLength = 240;
  customInput.placeholder = "Custom instruction...";
  customInput.rows = 2;
  customInput.addEventListener("focus", cancelAutoRewrite);
  customInput.addEventListener("input", cancelAutoRewrite);

  const customButton = document.createElement("button");
  customButton.type = "submit";
  customButton.className = "fixly-ai-popup__submit";
  customButton.append(createIcon("sparkles"), document.createTextNode("Apply"));

  custom.append(customInput, customButton);
  custom.addEventListener("submit", (event) => {
    event.preventDefault();
    const instruction = customInput.value.trim();
    if (instruction.length > 0) {
      void rewriteSelection(undefined, instruction);
    }
  });

  const status = document.createElement("div");
  status.className = "fixly-ai-popup__status";

  const spinner = document.createElement("span");
  spinner.className = "fixly-ai-popup__spinner";

  const message = document.createElement("span");
  message.className = "fixly-ai-popup__message";

  status.append(spinner, message);
  panel.append(header, actions, custom, status);

  panel.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
    }
    event.stopPropagation();
  });

  document.documentElement.append(panel);
  return panel;
}

function getPopup() {
  popup ??= createPopup();
  return popup;
}

function createIcon(name: IconName) {
  const wrapper = document.createElement("span");
  wrapper.className = "fixly-ai-popup__icon";
  wrapper.innerHTML = iconPaths[name];
  return wrapper;
}

const iconPaths: Record<IconName, string> = {
  briefcase:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M9.75 6.75V5.5A2.5 2.5 0 0 1 12.25 3h.5a2.5 2.5 0 0 1 2.5 2.5v1.25M4.75 9.25h14.5M8.25 12.25h7.5M5.5 6.75h13A1.5 1.5 0 0 1 20 8.25v9.25a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.25a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="m5 12.5 4.25 4.25L19 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  compress:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M8.5 4.5H4.75v3.75M15.5 4.5h3.75v3.75M8.5 19.5H4.75v-3.75M15.5 19.5h3.75v-3.75M9.25 9.25 4.75 4.75M14.75 9.25l4.5-4.5M9.25 14.75l-4.5 4.5M14.75 14.75l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expand:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M8.5 4.75H4.75V8.5M15.5 4.75h3.75V8.5M8.5 19.25H4.75V15.5M15.5 19.25h3.75V15.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  message:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M7.75 10.75h8.5M7.75 14.25h5.5M5.5 18.25l-2 2V6.75A2.75 2.75 0 0 1 6.25 4h11.5a2.75 2.75 0 0 1 2.75 2.75v8.75a2.75 2.75 0 0 1-2.75 2.75H5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sparkles:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 3.75 13.3 8.7 18.25 10l-4.95 1.3L12 16.25l-1.3-4.95L5.75 10l4.95-1.3L12 3.75ZM18.5 14.75l.65 2.35 2.35.65-2.35.65-.65 2.35-.65-2.35-2.35-.65 2.35-.65.65-2.35ZM5.5 14.25l.5 1.75 1.75.5-1.75.5-.5 1.75L5 17l-1.75-.5L5 16l.5-1.75Z" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wand:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="m14.75 5.25 4 4M4.75 19.25l10.5-10.5M13.5 4l1.25-2 1.25 2 2 1.25-2 1.25-1.25 2-1.25-2-2-1.25L13.5 4ZM18.75 15.25l.75-1.25.75 1.25 1.25.75-1.25.75-.75 1.25-.75-1.25-1.25-.75 1.25-.75ZM6.25 5.25 7 4l.75 1.25L9 6l-1.25.75L7 8l-.75-1.25L5 6l1.25-.75Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function setStatus(message: string, state: "idle" | "loading" | "error") {
  const panel = getPopup();
  const messageNode = panel.querySelector<HTMLSpanElement>(".fixly-ai-popup__message");
  if (messageNode) {
    messageNode.textContent = message;
  }

  panel.dataset.loading = String(state === "loading");
  panel.dataset.error = String(state === "error");
}

function resetCustomInput() {
  const input = popup?.querySelector<HTMLTextAreaElement>(".fixly-ai-popup__input");
  if (input) {
    input.value = "";
  }
}

function showPopup(rect: DOMRect) {
  const panel = getPopup();
  setStatus("", "idle");
  resetCustomInput();
  panel.style.left = "0px";
  panel.style.top = "0px";
  panel.dataset.open = "true";

  requestAnimationFrame(() => {
    const panelRect = panel.getBoundingClientRect();
    const left = clamp(
      rect.left + rect.width / 2 - panelRect.width / 2,
      POPUP_MARGIN,
      window.innerWidth - panelRect.width - POPUP_MARGIN
    );
    const above = rect.top - panelRect.height - POPUP_MARGIN;
    const top = above > POPUP_MARGIN ? above : rect.bottom + POPUP_MARGIN;

    panel.style.left = `${left}px`;
    panel.style.top = `${clamp(top, POPUP_MARGIN, window.innerHeight - panelRect.height - POPUP_MARGIN)}px`;
  });
}

function hidePopup() {
  if (!popup) {
    return;
  }

  popup.dataset.open = "false";
  cancelAutoRewrite();
  setStatus("", "idle");
}

function scheduleSelectionCheck() {
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(checkSelection, 80);
}

function checkSelection() {
  if (popup?.matches(":hover")) {
    return;
  }

  const inputSelection = getInputSelection();
  if (inputSelection) {
    storedSelection = inputSelection;
    showPopup(getTextControlSelectionRect(inputSelection.element, inputSelection.end));
    scheduleAutoRewrite();
    return;
  }

  const editableSelection = getEditableSelection();
  if (editableSelection) {
    storedSelection = editableSelection;
    showPopup(getRangeRect(editableSelection.range));
    scheduleAutoRewrite();
    return;
  }

  storedSelection = null;
  hidePopup();
}

function getInputSelection(): InputSelection | null {
  const element = document.activeElement;
  if (!isEditableTextControl(element)) {
    return null;
  }

  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;
  const text = element.value.slice(start, end).trim();

  if (end <= start || text.length < MIN_SELECTION_LENGTH) {
    return null;
  }

  return { kind: "input", element, start, end, text };
}

function getEditableSelection(): EditableSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const parent =
    container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;

  const editable = parent?.closest<HTMLElement>("[contenteditable='true'], [contenteditable='plaintext-only']");
  if (!editable) {
    return null;
  }

  const text = selection.toString().trim();
  if (text.length < MIN_SELECTION_LENGTH) {
    return null;
  }

  return { kind: "contenteditable", element: editable, range: range.cloneRange(), text };
}

function isEditableTextControl(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  if (!(element instanceof HTMLInputElement) || element.disabled || element.readOnly) {
    return false;
  }

  return ["", "text", "search", "email", "url", "tel"].includes(element.type);
}

function getRangeRect(range: Range) {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  range.insertNode(marker);
  const markerRect = marker.getBoundingClientRect();
  marker.remove();
  return markerRect;
}

function getTextControlSelectionRect(element: HTMLInputElement | HTMLTextAreaElement, index: number) {
  const style = window.getComputedStyle(element);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");
  const rect = element.getBoundingClientRect();
  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "textTransform",
    "lineHeight",
    "textAlign",
    "wordSpacing",
    "tabSize"
  ] as const;

  mirror.style.position = "fixed";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = element instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  mirror.style.wordWrap = "break-word";
  mirror.style.left = `${rect.left}px`;
  mirror.style.top = `${rect.top}px`;

  for (const property of properties) {
    mirror.style[property] = style[property];
  }

  mirror.textContent = element.value.slice(0, index);
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);

  const markerRect = marker.getBoundingClientRect();
  mirror.remove();

  return new DOMRect(
    markerRect.left - element.scrollLeft,
    markerRect.top - element.scrollTop,
    1,
    Number.parseFloat(style.lineHeight) || 18
  );
}

function scheduleAutoRewrite() {
  cancelAutoRewrite();

  if (!storedSelection || isRewriting) {
    return;
  }

  const rewriteKey = `${storedSelection.kind}:${storedSelection.text}`;
  if (rewriteKey === lastAutoRewriteKey) {
    return;
  }

  autoRewriteTimer = window.setTimeout(() => {
    lastAutoRewriteKey = rewriteKey;
    void rewriteSelection();
  }, AUTO_REWRITE_DELAY_MS);
}

function cancelAutoRewrite() {
  window.clearTimeout(autoRewriteTimer);
  autoRewriteTimer = undefined;
}

async function rewriteSelection(action?: RewriteAction, instruction?: string) {
  if (!storedSelection) {
    hidePopup();
    return;
  }

  cancelAutoRewrite();
  isRewriting = true;
  setStatus("Rewriting...", "loading");

  try {
    const payload = {
      ...(action ? { action } : {}),
      ...(instruction ? { instruction } : {}),
      installId: await getInstallId(),
      source: {
        editorType: storedSelection.kind === "input" ? getInputEditorType(storedSelection.element) : "contenteditable",
        hostname: window.location.hostname,
        origin: window.location.origin
      },
      text: storedSelection.text
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { data?: { result?: unknown } };
    if (typeof data.data?.result !== "string" || data.data.result.trim().length === 0) {
      throw new Error("Backend returned an empty result.");
    }

    replaceSelection(data.data.result);
    storedSelection = null;
    hidePopup();
  } catch (error) {
    console.error("Fixly rewrite failed", error);
    setStatus("Could not rewrite. Try again.", "error");
  } finally {
    isRewriting = false;
  }
}

function replaceSelection(result: string) {
  if (!storedSelection) {
    return;
  }

  if (storedSelection.kind === "input") {
    const { element, start, end } = storedSelection;
    element.focus();
    element.setSelectionRange(start, end);
    element.setRangeText(result, start, end, "end");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: result }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const selection = window.getSelection();
  const { element, range } = storedSelection;
  selection?.removeAllRanges();
  selection?.addRange(range);
  range.deleteContents();
  range.insertNode(document.createTextNode(result));
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: result }));
}

async function getInstallId() {
  try {
    const stored = await chrome.storage.local.get([INSTALL_ID_KEY]);
    if (typeof stored[INSTALL_ID_KEY] === "string") {
      return stored[INSTALL_ID_KEY];
    }

    const installId = createInstallId();
    await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });
    return installId;
  } catch (error) {
    console.error("Fixly install id storage failed", error);
    fallbackInstallId ??= createInstallId();
    return fallbackInstallId;
  }
}

function createInstallId() {
  return `fx_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getInputEditorType(element: HTMLInputElement | HTMLTextAreaElement) {
  return element instanceof HTMLTextAreaElement ? "textarea" : "input";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

document.addEventListener("selectionchange", scheduleSelectionCheck);
document.addEventListener("mouseup", scheduleSelectionCheck, true);
document.addEventListener("keyup", scheduleSelectionCheck, true);
document.addEventListener("scroll", hidePopup, true);
window.addEventListener("resize", hidePopup);
document.addEventListener(
  "mousedown",
  (event) => {
    if (popup && !popup.contains(event.target as Node)) {
      hidePopup();
    }
  },
  true
);
