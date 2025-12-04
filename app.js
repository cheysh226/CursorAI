(() => {
  const ingestStage = document.getElementById("ingestStage");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseButton = document.getElementById("browseButton");
  const clearButton = document.getElementById("clearButton");
  const uploadButton = document.getElementById("uploadButton");
  const refreshButton = document.getElementById("refreshButton");
  const copyButton = document.getElementById("copyButton");
  const previewShell = document.getElementById("previewShell");
  const previewImage = document.getElementById("previewImage");
  const previewPdf = document.getElementById("previewPdf");
  const fileNameEl = document.getElementById("fileName");
  const fileMetaEl = document.getElementById("fileMeta");
  const previewPrev = document.getElementById("previewPrev");
  const previewNext = document.getElementById("previewNext");
  const previewPager = document.getElementById("previewPager");
  const responsePrev = document.getElementById("responsePrev");
  const responseNext = document.getElementById("responseNext");
  const responsePager = document.getElementById("responsePager");
  const spinner = document.getElementById("spinner");
  const spinnerLabel = spinner ? spinner.querySelector(".spinner__label") : null;
  const placeholder = document.getElementById("placeholder");
  const responseContainer = document.getElementById("responseContainer");
  const historyList = document.getElementById("historyList");
  const historyEmptyMessage = document.getElementById("historyEmptyMessage");
  const clearHistoryButton = document.getElementById("clearHistoryButton");
  const mockToggleButton = document.getElementById("mockToggle");
  const errorTemplate = document.getElementById("errorTemplate");

  const USE_FAKE_API = true;
  const FAKE_DELAY_MS = 1000;
  const API_ENDPOINT = document.body.dataset?.apiEndpoint || "/api/documents/parse";
  const DEFAULT_MOCK_MODE = document.body.dataset?.mockMode !== "false";
  const PAGE_BREAK_MARKER = "<!-- PAGE BREAK -->";
  const PAGE_BREAK_REGEX = /<!--\s*PAGE BREAK\s*-->/gi;
  const MOCK_ASSET_DIR = "모의모드";
  const MOCK_IMAGE_PATH = `${MOCK_ASSET_DIR}/input_test.jpg`;
  const MOCK_HTML_PATH = `${MOCK_ASSET_DIR}/output_test.html`;

  const createId = () =>
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const state = {
    file: null,
    isLoading: false,
    history: [],
    mockMode: DEFAULT_MOCK_MODE,
    activeJobId: null,
    previewPages: [],
    previewMeta: "",
    responsePages: [],
    currentPage: 0,
    lastResponse: ""
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const formatDisplayName = (name = "") => name.replace(/_/g, " ");
  const formatFileMeta = (file) => `${file.type || "알 수 없음"} · ${formatBytes(file.size)}`;

  const createMockFile = () => ({
    name: "input_test.jpg",
    type: "image/jpeg",
    size: 256000,
    isMock: true
  });

  const splitHtmlIntoPages = (html = "") =>
    html
      .split(PAGE_BREAK_REGEX)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

  const readAsDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

  const setClearButtonState = (disabled) => {
    clearButton.setAttribute("aria-disabled", disabled ? "true" : "false");
    clearButton.disabled = disabled;
  };

  const setStageMode = (hasPreview) => {
    ingestStage.classList.toggle("is-preview", hasPreview);
    dropzone.hidden = hasPreview;
    previewShell.hidden = !hasPreview;
  };

  const updatePreviewMeta = (name, meta) => {
    if (!name && !meta) {
      setStageMode(false);
      fileNameEl.textContent = "";
      fileMetaEl.textContent = "";
      return;
    }
    setStageMode(true);
    fileNameEl.textContent = name;
    fileMetaEl.textContent = meta;
  };

  const clearPreviewMedia = () => {
    previewImage.removeAttribute("src");
    previewImage.hidden = true;
    previewPdf.hidden = true;
  };

  const renderPreviewPage = () => {
    if (!state.previewPages.length) {
      clearPreviewMedia();
      return;
    }
    const src = state.previewPages[state.currentPage];
    if (src) {
      previewImage.src = src;
      previewImage.hidden = false;
      previewPdf.hidden = true;
    } else {
      previewImage.removeAttribute("src");
      previewImage.hidden = true;
      previewPdf.hidden = false;
      previewPdf.textContent = `PDF · Page ${state.currentPage + 1}`;
    }
  };

  const renderResponsePage = () => {
    const html = state.responsePages[state.currentPage] || "";
    responseContainer.innerHTML = html;
  };

  const getTotalPages = () => {
    const previewCount = state.previewPages.length;
    const responseCount = state.responsePages.length;
    const total = Math.max(previewCount, responseCount);
    return total || 0;
  };

  const syncPager = () => {
    const total = getTotalPages();
    const hasPages = total > 0;
    const currentDisplay = hasPages ? state.currentPage + 1 : 0;
    const label = `${currentDisplay} / ${total}`;
    previewPager.textContent = label;
    responsePager.textContent = label;

    const disablePrev = !hasPages || state.currentPage === 0;
    const disableNext = !hasPages || state.currentPage >= total - 1;
    [previewPrev, responsePrev].forEach((btn) => (btn.disabled = disablePrev));
    [previewNext, responseNext].forEach((btn) => (btn.disabled = disableNext));
  };

  const changePage = (delta) => {
    const total = getTotalPages();
    if (!total) return;
    const next = Math.min(Math.max(state.currentPage + delta, 0), total - 1);
    if (next === state.currentPage) return;
    state.currentPage = next;
    renderPreviewPage();
    renderResponsePage();
    syncPager();
  };

  const hasResponseContent = () =>
    state.responsePages.some((page) => page && page.trim().length > 0);

  const combinedResponseHtml = () =>
    state.responsePages
      .map((page, idx) => (page ? `<!-- Page ${idx + 1} -->\n${page.trim()}` : ""))
      .filter(Boolean)
      .join(`\n\n${PAGE_BREAK_MARKER}\n\n`);

  const updateCopyButtonState = () => {
    state.lastResponse = hasResponseContent() ? combinedResponseHtml() : "";
    copyButton.disabled = state.isLoading || !state.lastResponse;
  };

  const toggleLoading = (isLoading, message = "분석 중...") => {
    state.isLoading = isLoading;
    if (spinner) {
      spinner.hidden = !isLoading;
      if (spinnerLabel) spinnerLabel.textContent = message;
    }
    const disableActions = isLoading || !state.file;
    uploadButton.disabled = disableActions;
    refreshButton.disabled = disableActions;
    updateCopyButtonState();
  };

  const resetResponseView = () => {
    state.responsePages = [];
    state.currentPage = 0;
    responseContainer.innerHTML = "";
    placeholder.hidden = false;
    updateCopyButtonState();
    syncPager();
  };

  const renderResponse = (pagesInput) => {
    const pages = Array.isArray(pagesInput) ? pagesInput : [pagesInput];
    state.responsePages = pages.map((page) => page ?? "");
    state.currentPage = 0;
    const hasContent = hasResponseContent();
    placeholder.hidden = hasContent;
    if (hasContent) {
      renderResponsePage();
    } else {
      responseContainer.innerHTML = "";
    }
    updateCopyButtonState();
    renderPreviewPage();
    syncPager();
  };

  const renderError = () => {
    responseContainer.innerHTML = "";
    if (errorTemplate) {
      responseContainer.appendChild(errorTemplate.content.cloneNode(true));
    } else {
      responseContainer.textContent = "요청 중 오류가 발생했습니다.";
    }
    placeholder.hidden = true;
    state.responsePages = [];
    updateCopyButtonState();
  };

  const loadMockHtmlPages = async () => {
    try {
      const response = await fetch(MOCK_HTML_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${MOCK_HTML_PATH}`);
      const text = await response.text();
      const pages = splitHtmlIntoPages(text);
      return pages.length ? pages : ["<p>모의 HTML을 불러오지 못했습니다.</p>"];
    } catch (error) {
      console.error("Mock HTML load failed", error);
      return ["<p>모의 HTML을 불러오지 못했습니다.</p>"];
    }
  };

  const setMockMode = (enabled) => {
    state.mockMode = enabled;
    mockToggleButton.textContent = enabled ? "모의 모드 켜짐" : "모의 모드 꺼짐";
    mockToggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    dropzone.classList.toggle("is-mock", enabled);
    clearFile();
  };

  const setPreview = async (file) => {
    let previewFile = file;
    if (state.mockMode) {
      previewFile = createMockFile();
      state.previewPages = [MOCK_IMAGE_PATH];
    } else if (!previewFile) {
      state.previewPages = [];
    } else if (previewFile.type.startsWith("image/")) {
      const dataUrl = await readAsDataUrl(previewFile);
      state.previewPages = [dataUrl];
    } else if (previewFile.type.includes("pdf")) {
      state.previewPages = [null];
    } else {
      state.previewPages = [null];
    }

    if (!previewFile) {
      state.previewMeta = "";
      updatePreviewMeta("", "");
      clearPreviewMedia();
      syncPager();
      return;
    }

    const displayName = formatDisplayName(previewFile.name);
    const metaText = formatFileMeta(previewFile);
    state.previewMeta = metaText;
    state.currentPage = 0;
    updatePreviewMeta(displayName, metaText);
    renderPreviewPage();
    syncPager();
  };

  const sendToApi = async (file, jobId = createId()) => {
    if (!file) return;
    const displayName = formatDisplayName(file.name);
    toggleLoading(true, `PoC · ${displayName} 분석 중...`);
    placeholder.hidden = true;

...