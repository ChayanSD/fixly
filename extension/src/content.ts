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
  label: string;
}

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

const API_URL = "http://localhost:4000/api/v1/rewrites";
const INSTALL_ID_KEY = "fixlyInstallId";
const MIN_SELECTION_LENGTH = 3;
const POPUP_MARGIN = 10;
const ACTIONS: ActionOption[] = [
  { action: "fix_grammar", label: "Fix grammar" },
  { action: "professional", label: "Make professional" },
  { action: "casual", label: "Make casual" },
  { action: "shorter", label: "Make shorter" },
  { action: "clearer", label: "Make clearer" }
];

let popup: HTMLDivElement | null = null;
let storedSelection: StoredSelection | null = null;
let hideTimer: number | undefined;

function createPopup() {
  const panel = document.createElement("div");
  panel.className = "fixly-ai-popup";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "AI rewrite actions");

  const header = document.createElement("div");
  header.className = "fixly-ai-popup__header";

  const spark = document.createElement("span");
  spark.className = "fixly-ai-popup__spark";

  const title = document.createElement("span");
  title.textContent = "Rewrite with AI";

  header.append(spark, title);

  const actions = document.createElement("div");
  actions.className = "fixly-ai-popup__actions";

  for (const option of ACTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fixly-ai-popup__button";
    button.textContent = option.label;
    button.addEventListener("click", () => void rewriteSelection(option.action));
    actions.append(button);
  }

  const status = document.createElement("div");
  status.className = "fixly-ai-popup__status";

  const spinner = document.createElement("span");
  spinner.className = "fixly-ai-popup__spinner";

  const message = document.createElement("span");
  message.className = "fixly-ai-popup__message";

  status.append(spinner, message);
  panel.append(header, actions, status);

  panel.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  document.documentElement.append(panel);
  return panel;
}

function getPopup() {
  popup ??= createPopup();
  return popup;
}

function setStatus(message: string, state: "idle" | "loading" | "error") {
  const panel = getPopup();
  const messageNode = panel.querySelector<HTMLSpanElement>(".fixly-ai-popup__message");
  if (messageNode) {
    messageNode.textContent = message;
  }

  panel.dataset.loading = String(state === "loading");
  panel.dataset.error = String(state === "error");
}

function showPopup(rect: DOMRect) {
  const panel = getPopup();
  setStatus("", "idle");
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
    return;
  }

  const editableSelection = getEditableSelection();
  if (editableSelection) {
    storedSelection = editableSelection;
    showPopup(getRangeRect(editableSelection.range));
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

async function rewriteSelection(action: RewriteAction) {
  if (!storedSelection) {
    hidePopup();
    return;
  }

  setStatus("Rewriting...", "loading");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        installId: await getInstallId(),
        source: {
          editorType: storedSelection.kind === "input" ? getInputEditorType(storedSelection.element) : "contenteditable",
          hostname: window.location.hostname,
          origin: window.location.origin
        },
        text: storedSelection.text
      })
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
  const stored = await chrome.storage.local.get([INSTALL_ID_KEY]);
  if (typeof stored[INSTALL_ID_KEY] === "string") {
    return stored[INSTALL_ID_KEY];
  }

  const installId = `fx_${crypto.randomUUID().replace(/-/g, "")}`;
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });
  return installId;
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
