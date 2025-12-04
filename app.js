(() => {
  const ingestStage = document.getElementById("ingestStage");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseButton = document.getElementById("browseButton");
  const clearButton = document.getElementById("clearButton");
  const uploadButton = document.getElementById("uploadButton");
  const refreshButton = document.getElementById("refreshButton");
  const downloadButton = document.getElementById("copyButton");
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
  const MOCK_INPUT = encodeURI(`모의모드/input_test.jpg`);
  const DOWNLOAD_LABEL_DEFAULT = "결과 다운로드";
  const ORIGINAL_RESULT_STYLE = `
body{margin:0;padding:10px;font-family:Arial,sans-serif;color:#111}
.container{position:relative;border:1px solid #ccc;background:#fff}
.block{position:absolute;border:1px solid #999;padding:2px;box-sizing:border-box;font-size:12px;line-height:1.2;background:#fff}
table{width:100%;border-collapse:collapse;font-size:11px}
td{border:1px solid #999;padding:2px;text-align:center}
`;
const SCOPED_RESULT_STYLE = `
.result-html-root{margin:0;padding:10px;height:100%;width:100%;max-width:100%;box-sizing:border-box;font-family:Arial,sans-serif;overflow:auto;background:#fff;color:#111}
.result-html-root .container{position:relative;border:1px solid #ccc;background:#fff}
.result-html-root .block{position:absolute;border:1px solid #999;padding:2px;box-sizing:border-box;font-size:12px;line-height:1.2;background:#fff}
.result-html-root table{width:100%;border-collapse:collapse;font-size:11px}
.result-html-root td{border:1px solid #999;padding:2px;text-align:center}
`;
const MOCK_BODY_HTML = `
  <div class="container" style="width:775px;height:420px">
    <div class="block" style="left:20px;top:20px;width:220px;height:32px;background:#f3e5f5">샘플 분석 Preview</div>
    <div class="block" style="left:20px;top:70px;width:320px;height:190px;background:#e3f2fd">
      <table>
        <tr><td>필드</td><td>값</td><td>신뢰도</td></tr>
        <tr><td>문서 유형</td><td>세금계산서</td><td>0.92</td></tr>
        <tr><td>발행일</td><td>2025-12-01</td><td>0.88</td></tr>
        <tr><td>총 금액</td><td>₩1,250,000</td><td>0.95</td></tr>
      </table>
    </div>
    <div class="block" style="left:360px;top:70px;width:370px;height:260px;background:#fffdee">
      <p style="margin:0 0 8px;font-size:11px;text-align:left;">비고</p>
      <p style="margin:0;font-size:11px;text-align:left;">PoC 단계에서는 응답 HTML을 직접 수정/복사해도 됩니다.</p>
    </div>
  </div>`

const buildHtmlDocument = (bodyHTML) =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${ORIGINAL_RESULT_STYLE}</style></head><body>${bodyHTML}</body></html>`;
const MOCK_DEFAULT_PAGES = [buildHtmlDocument(MOCK_BODY_HTML)];
const workspaceBody = document.querySelector(".workspace__body");
const panelSplitter = document.getElementById("panelSplitter");

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
    history: [],
    lastFileName: ""
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

  const extractBodyContent = (htmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      return doc.body ? doc.body.innerHTML : htmlString;
    } catch (error) {
      console.warn("Failed to parse HTML document.", error);
      return htmlString;
    }
  };

  const renderResponsePage = () => {
    const html = state.responsePages[state.currentPage] || "";
    responseContainer.innerHTML = "";
    responseContainer.hidden = !html;
    if (!html) return;

    const styleEl = document.createElement("style");
    styleEl.textContent = SCOPED_RESULT_STYLE;
    responseContainer.appendChild(styleEl);

    const editor = document.createElement("div");
    editor.className = "result-html-root";
    editor.contentEditable = "true";
    editor.spellcheck = false;
    editor.innerHTML = extractBodyContent(html);
    responseContainer.appendChild(editor);

    const persistChanges = () => {
      state.responsePages[state.currentPage] = buildHtmlDocument(editor.innerHTML);
      updateDownloadState();
    };

    editor.addEventListener("input", persistChanges);
  };

  const MIN_INGEST_WIDTH = 280;
  const MIN_RESPONSE_WIDTH = 360;
  let isResizingPanels = false;

  const setIngestWidthFromPointer = (clientX) => {
    if (!workspaceBody) return;
    const rect = workspaceBody.getBoundingClientRect();
    if (!rect.width) return;
    const maxWidth = Math.max(rect.width - MIN_RESPONSE_WIDTH, MIN_INGEST_WIDTH);
    const minWidth = Math.min(MIN_INGEST_WIDTH, maxWidth);
    let nextWidth = clientX - rect.left;
    nextWidth = Math.max(minWidth, Math.min(maxWidth, nextWidth));
    const percent = (nextWidth / rect.width) * 100;
    workspaceBody.style.setProperty("--ingest-width", `${percent}%`);
  };

  const startPanelResize = (event) => {
    if (!panelSplitter) return;
    isResizingPanels = true;
    panelSplitter.classList.add("is-dragging");
    document.body.classList.add("is-resizing");
    panelSplitter.setPointerCapture?.(event.pointerId);
    setIngestWidthFromPointer(event.clientX);
    event.preventDefault();
  };

  const stopPanelResize = (event) => {
    if (!isResizingPanels) return;
    isResizingPanels = false;
    if (event && typeof event.pointerId === "number") {
      panelSplitter?.releasePointerCapture?.(event.pointerId);
    }
    panelSplitter?.classList.remove("is-dragging");
    document.body.classList.remove("is-resizing");
  };

  const handlePanelResize = (event) => {
    if (!isResizingPanels) return;
    setIngestWidthFromPointer(event.clientX);
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

  const updateDownloadState = () => {
    state.lastResponse = hasResponseContent() ? combinedResponse() : "";
    if (downloadButton) {
      downloadButton.disabled = state.isLoading || !state.lastResponse;
    }
  };
const updateCopyState = () => updateDownloadState();

  const toggleLoading = (isLoading, message = "분석 중...") => {
    state.isLoading = isLoading;
    if (spinner) {
      spinner.hidden = !isLoading;
      if (spinnerLabel) spinnerLabel.textContent = message;
    }
    const disabled = isLoading || !state.file;
    if (uploadButton) uploadButton.disabled = disabled;
    refreshButton.disabled = disabled;
    updateCopyState();
  };

  const resetResponseView = () => {
    state.responsePages = [];
    state.currentPage = 0;
    responseContainer.innerHTML = "";
    responseContainer.hidden = true;
    placeholder.hidden = false;
    updateDownloadState();
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
      responseContainer.hidden = true;
    }
    updateDownloadState();
    renderPreviewPage();
    syncPager();
  };

  const renderError = () => {
    responseContainer.innerHTML = "";
    responseContainer.hidden = false;
    if (errorTemplate) {
      responseContainer.appendChild(errorTemplate.content.cloneNode(true));
    } else {
      responseContainer.textContent = "요청 중 오류가 발생했습니다.";
    }
    placeholder.hidden = true;
    state.responsePages = [];
    updateDownloadState();
  };

  const loadMockHtmlPages = async () => MOCK_DEFAULT_PAGES;

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
        const [pages] = await Promise.all([
          loadMockHtmlPages(),
          new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS))
        ]);
        htmlPages = pages;
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
      const isSameJob = state.activeJobId === jobId;
      if (isSameJob) {
        toggleLoading(false);
        state.activeJobId = null;
      } else if (!state.activeJobId) {
        toggleLoading(false);
      }
    }
  };

  const handleFile = async (file) => {
    const selectedFile = state.mockMode ? createMockFile() : file;
    if (!selectedFile) return;
    const jobId = createId();
    state.activeJobId = jobId;
    state.file = selectedFile;
    state.lastFileName = selectedFile.name || "";
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
    state.lastFileName = "";
    setClearButtonState(true);
    if (uploadButton) uploadButton.disabled = true;
    refreshButton.disabled = true;
    if (downloadButton) downloadButton.textContent = DOWNLOAD_LABEL_DEFAULT;
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

  const buildDownloadFileName = () => {
    if (state.lastFileName) {
      const base = state.lastFileName.replace(/\.[^.]+$/, "") || "ai-result";
      return `${base}-result.html`;
    }
    return "ai-result.html";
  };

  const handleDownload = () => {
    if (!state.lastResponse || !downloadButton) return;
    const blob = new Blob([state.lastResponse], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const originalText = downloadButton.textContent || DOWNLOAD_LABEL_DEFAULT;
    downloadButton.textContent = "다운로드 완료";
    setTimeout(() => {
      downloadButton.textContent = originalText || DOWNLOAD_LABEL_DEFAULT;
    }, 1500);
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
    state.lastFileName = entry.name || "";
    updatePreviewMeta(formatDisplayName(entry.name), state.previewMeta);
    renderPreviewPage();
    if (hasResponseContent()) {
      placeholder.hidden = true;
      renderResponsePage();
    } else {
      placeholder.hidden = false;
      responseContainer.innerHTML = "";
      responseContainer.hidden = true;
    }
    updateDownloadState();
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

    if (uploadButton) uploadButton.addEventListener("click", triggerReanalysis);
    refreshButton.addEventListener("click", triggerReanalysis);
    if (downloadButton) downloadButton.addEventListener("click", handleDownload);
    clearHistoryButton.addEventListener("click", clearHistory);
    mockToggleButton.addEventListener("click", () => setMockMode(!state.mockMode));

    previewPrev.addEventListener("click", () => changePage(-1));
    previewNext.addEventListener("click", () => changePage(1));
    responsePrev.addEventListener("click", () => changePage(-1));
    responseNext.addEventListener("click", () => changePage(1));
    if (panelSplitter && workspaceBody) {
      panelSplitter.addEventListener("pointerdown", startPanelResize);
      document.addEventListener("pointermove", handlePanelResize);
      document.addEventListener("pointerup", stopPanelResize);
      document.addEventListener("pointerleave", stopPanelResize);
    }

    if (uploadButton) uploadButton.disabled = true;
    refreshButton.disabled = true;
    if (downloadButton) downloadButton.disabled = true;
    if (downloadButton) downloadButton.textContent = DOWNLOAD_LABEL_DEFAULT;
    setClearButtonState(true);
    setMockMode(state.mockMode);
    syncPager();
  };

  init();
})();
