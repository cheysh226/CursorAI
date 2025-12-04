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
  const responseRetryButton = document.getElementById("uploadButtonSecondary");
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
  const MOCK_DIR = "모의모드";
  const MOCK_INPUT = encodeURI(`${MOCK_DIR}/input_test.jpg`);
  const MOCK_OUTPUT = encodeURI(`${MOCK_DIR}/output_test.html`);

  const createId = () =>
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const state = {
    file: null,
    isLoading: false,
    mockMode: DEFAULT_MOCK_MODE,
    activeJobId: null,
    previewPages: [],
    previewMeta: "",
    responsePages: [],
    currentPage: 0,
    lastResponse: "",
    history: []
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const formatDisplayName = (name = "") => name.replace(/_/g, " ");
  const formatMeta = (file) => `${file.type || "알 수 없음"} · ${formatBytes(file.size)}`;

  const createMockFile = () => ({
    name: "input_test.jpg",
    type: "image/jpeg",
    size: 256000,
    isMock: true
  });

  const splitPages = (html = "") =>
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
    responseContainer.innerHTML = state.responsePages[state.currentPage] || "";
  };

  const totalPages = () => Math.max(state.previewPages.length, state.responsePages.length, 0);

  const syncPager = () => {
    const total = totalPages();
    const hasPages = total > 0;
    const display = hasPages ? state.currentPage + 1 : 0;
    previewPager.textContent = `${display} / ${total}`;
    responsePager.textContent = `${display} / ${total}`;
    const disablePrev = !hasPages || state.currentPage === 0;
    const disableNext = !hasPages || state.currentPage >= total - 1;
    [previewPrev, responsePrev].forEach((btn) => (btn.disabled = disablePrev));
    [previewNext, responseNext].forEach((btn) => (btn.disabled = disableNext));
  };

  const changePage = (delta) => {
    const total = totalPages();
    if (!total) return;
    const next = Math.min(Math.max(state.currentPage + delta, 0), total - 1);
    if (next === state.currentPage) return;
    state.currentPage = next;
    renderPreviewPage();
    renderResponsePage();
    syncPager();
  };

  const hasResponseContent = () => state.responsePages.some((page) => page && page.trim().length > 0);

  const combinedResponse = () =>
    state.responsePages
      .map((page, idx) => (page ? `<!-- Page ${idx + 1} -->\n${page.trim()}` : ""))
      .filter(Boolean)
      .join(`\n\n${PAGE_BREAK_MARKER}\n\n`);

  const updateCopyState = () => {
    state.lastResponse = hasResponseContent() ? combinedResponse() : "";
    copyButton.disabled = state.isLoading || !state.lastResponse;
  };

  const toggleLoading = (isLoading, message = "분석 중...") => {
    state.isLoading = isLoading;
    if (spinner) {
      spinner.hidden = !isLoading;
      if (spinnerLabel) spinnerLabel.textContent = message;
    }
    const disabled = isLoading || !state.file;
    uploadButton.disabled = disabled;
    refreshButton.disabled = disabled;
    if (responseRetryButton) responseRetryButton.disabled = disabled;
    updateCopyState();
  };

  const resetResponseView = () => {
    state.responsePages = [];
    state.currentPage = 0;
    responseContainer.innerHTML = "";
    placeholder.hidden = false;
    updateCopyState();
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
    updateCopyState();
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
    updateCopyState();
  };

  const loadMockHtmlPages = async () => {
    try {
      const response = await fetch(MOCK_OUTPUT, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${MOCK_OUTPUT}`);
      const text = await response.text();
      const pages = splitPages(text);
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
      state.previewPages = [MOCK_INPUT];
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
    const metaText = formatMeta(previewFile);
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

    try {
      let htmlPages;
      if (state.mockMode) {
        htmlPages = await loadMockHtmlPages();
      } else if (USE_FAKE_API) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));
        htmlPages = ["<p>샘플 응답입니다.</p>"];
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          body: formData,
          headers: { Accept: "text/html" }
        });
        if (!response.ok) throw new Error(`API responded with ${response.status}`);
        const html = await response.text();
        htmlPages = [html];
      }

      if (state.mockMode && state.previewPages.length < htmlPages.length) {
        const fallback = state.previewPages[0] || MOCK_INPUT;
        state.previewPages = Array.from({ length: htmlPages.length }, (_, idx) => state.previewPages[idx] || fallback);
      }

      if (state.activeJobId === jobId) {
        renderResponse(htmlPages);
        addHistoryEntry({
          file,
          pages: htmlPages,
          previewPages: state.previewPages,
          isPdf: file.type.includes("pdf")
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
      if (state.activeJobId === jobId) {
        renderError();
      }
    } finally {
      if (state.activeJobId === jobId) {
        toggleLoading(false);
        state.activeJobId = null;
      }
    }
  };

  const handleFile = async (file) => {
    const selectedFile = state.mockMode ? createMockFile() : file;
    if (!selectedFile) return;
    const jobId = createId();
    state.activeJobId = jobId;
    state.file = selectedFile;
    setClearButtonState(false);
    await setPreview(selectedFile);
    sendToApi(selectedFile, jobId);
  };

  const clearFile = () => {
    state.file = null;
    fileInput.value = "";
    state.previewPages = [];
    state.previewMeta = "";
    state.responsePages = [];
    state.currentPage = 0;
    state.activeJobId = null;
    state.lastResponse = "";
    setClearButtonState(true);
    uploadButton.disabled = true;
    refreshButton.disabled = true;
    if (responseRetryButton) responseRetryButton.disabled = true;
    updatePreviewMeta("", "");
    clearPreviewMedia();
    resetResponseView();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    if (state.mockMode) {
      handleFile(null);
      return;
    }
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const preventDefaults = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCopy = async () => {
    if (!state.lastResponse) return;
    try {
      await navigator.clipboard.writeText(state.lastResponse);
      copyButton.textContent = "복사 완료";
      setTimeout(() => {
        copyButton.textContent = "HTML 복사";
      }, 1500);
    } catch (error) {
      console.warn("Clipboard unavailable", error);
    }
  };

  const buildHistoryItem = (entry) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-entry";
    button.dataset.historyId = entry.id;

    const thumb = document.createElement("div");
    thumb.className = "history-thumb";
    const previewSrc = entry.previewPages?.[0];
    if (previewSrc) {
      const img = document.createElement("img");
      img.src = previewSrc;
      img.alt = `${formatDisplayName(entry.name)} thumbnail`;
      thumb.appendChild(img);
    } else {
      thumb.textContent = entry.isPdf ? "PDF" : "FILE";
    }

    const metaWrap = document.createElement("div");
    metaWrap.className = "history-meta";
    const nameEl = document.createElement("p");
    nameEl.className = "file-name";
    nameEl.textContent = formatDisplayName(entry.name);
    const metaEl = document.createElement("p");
    metaEl.className = "file-meta";
    const pagesLabel = entry.pages?.length ? `${entry.pages.length}p` : "1p";
    metaEl.textContent = `${entry.timestamp} · ${pagesLabel}`;
    metaWrap.appendChild(nameEl);
    metaWrap.appendChild(metaEl);

    button.appendChild(thumb);
    button.appendChild(metaWrap);
    button.addEventListener("click", () => loadHistoryEntry(entry.id));
    li.appendChild(button);
    return li;
  };

  const refreshHistory = () => {
    historyList.querySelectorAll(".history-item").forEach((item) => item.remove());
    historyEmptyMessage.hidden = state.history.length > 0;
    state.history.forEach((entry) => historyList.appendChild(buildHistoryItem(entry)));
  };

  const addHistoryEntry = ({ file, pages, previewPages, isPdf }) => {
    const entry = {
      id: createId(),
      name: file.name,
      pages: pages.map((page) => page),
      previewPages: previewPages.map((src) => src),
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isPdf,
      fileMeta: state.previewMeta || formatMeta(file)
    };
    state.history = [entry, ...state.history].slice(0, 10);
    refreshHistory();
  };

  const loadHistoryEntry = (entryId) => {
    const entry = state.history.find((item) => item.id === entryId);
    if (!entry) return;
    state.previewPages = entry.previewPages?.map((src) => src) ?? [];
    state.responsePages = entry.pages?.map((page) => page) ?? [];
    state.previewMeta = entry.fileMeta || "";
    state.currentPage = 0;
    updatePreviewMeta(formatDisplayName(entry.name), state.previewMeta);
    renderPreviewPage();
    if (hasResponseContent()) {
      placeholder.hidden = true;
      renderResponsePage();
    } else {
      placeholder.hidden = false;
      responseContainer.innerHTML = "";
    }
    updateCopyState();
    syncPager();
  };

  const clearHistory = () => {
    state.history = [];
    refreshHistory();
  };

  const registerDragEvents = () => {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        preventDefaults(event);
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        preventDefaults(event);
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", handleDrop);
  };

  const handleResponseEdit = () => {
    if (!state.responsePages.length) {
      state.responsePages = [responseContainer.innerHTML];
      state.currentPage = 0;
    } else {
      state.responsePages[state.currentPage] = responseContainer.innerHTML;
    }
    placeholder.hidden = hasResponseContent();
    updateCopyState();
  };

  const init = () => {
    registerDragEvents();

    const requestMockFile = () => handleFile(null);
    const requestRealFile = () => fileInput.click();

    dropzone.addEventListener("click", () => {
      if (state.mockMode) requestMockFile();
      else requestRealFile();
    });

    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (state.mockMode) requestMockFile();
        else requestRealFile();
      }
    });

    browseButton.addEventListener("click", () => {
      if (state.mockMode) requestMockFile();
      else requestRealFile();
    });

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleFile(file);
    });

    clearButton.addEventListener("click", () => {
      if (clearButton.getAttribute("aria-disabled") === "true") return;
      clearFile();
    });

    const triggerReanalysis = () => {
      if (!state.file || state.isLoading) return;
      const jobId = createId();
      state.activeJobId = jobId;
      sendToApi(state.file, jobId);
    };

    uploadButton.addEventListener("click", triggerReanalysis);
    refreshButton.addEventListener("click", triggerReanalysis);
    responseRetryButton?.addEventListener("click", triggerReanalysis);

    copyButton.addEventListener("click", handleCopy);
    clearHistoryButton.addEventListener("click", clearHistory);
    mockToggleButton.addEventListener("click", () => setMockMode(!state.mockMode));

    previewPrev.addEventListener("click", () => changePage(-1));
    previewNext.addEventListener("click", () => changePage(1));
    responsePrev.addEventListener("click", () => changePage(-1));
    responseNext.addEventListener("click", () => changePage(1));

    responseContainer.addEventListener("input", handleResponseEdit);

    uploadButton.disabled = true;
    refreshButton.disabled = true;
    if (responseRetryButton) responseRetryButton.disabled = true;
    copyButton.disabled = true;
    setClearButtonState(true);
    setMockMode(state.mockMode);
    syncPager();
  };

  init();
})();
