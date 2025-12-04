(() => {
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
  const MOCK_PAGE_COUNT = 3;
  const PAGE_BREAK = "\n\n<!-- PAGE BREAK -->\n\n";

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
    previewName: "",
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
    name: "샘플 문서.jpg",
    type: "image/jpeg",
    size: 256000,
    isMock: true
  });

  const createMockPreviewPages = (count) =>
    Array.from({ length: count }, (_, idx) => {
      const page = idx + 1;
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
          <defs>
            <linearGradient id="g${page}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6c7bff" />
              <stop offset="100%" stop-color="#5de0ff" />
            </linearGradient>
          </defs>
          <rect width="320" height="420" rx="24" fill="#0d1020" />
          <rect x="40" y="80" width="240" height="180" rx="16" fill="rgba(255,255,255,0.08)" />
          <rect x="40" y="280" width="200" height="20" rx="10" fill="url(#g${page})" />
          <rect x="40" y="310" width="160" height="16" rx="8" fill="rgba(255,255,255,0.2)" />
          <text x="50%" y="60%" text-anchor="middle" fill="#9fa9ff" font-size="22" font-family="'Inter', sans-serif">PAGE ${page}</text>
        </svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    });

  const createFakeHtmlPages = (count = MOCK_PAGE_COUNT) =>
    Array.from({ length: count }, (_, idx) => {
      const page = idx + 1;
      return `<section data-page="${page}">
        <h3>필드 추출 미리보기 · Page ${page}</h3>
        <table>
          <thead>
            <tr>
              <th>열</th>
              <th>예측 값</th>
              <th>신뢰도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>제목</td>
              <td>거래 내역 요약 ${page}</td>
              <td>0.93</td>
            </tr>
            <tr>
              <td>문서 유형</td>
              <td>Invoice</td>
              <td>0.88</td>
            </tr>
            <tr>
              <td>페이지</td>
              <td>${page}</td>
              <td>0.74</td>
            </tr>
          </tbody>
        </table>
        <p class="muted">※ 현재는 PoC용 예시 데이터가 표시됩니다.</p>
      </section>`;
    });

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

  const updatePreviewMeta = (name, meta) => {
    if (!name && !meta) {
      previewShell.hidden = true;
      fileNameEl.textContent = "";
      fileMetaEl.textContent = "";
      return;
    }
    previewShell.hidden = false;
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
    const max = Math.max(previewCount, responseCount);
    return max || 0;
  };

  const syncPager = () => {
    const total = getTotalPages();
    const hasPages = total > 0;
    const currentDisplay = hasPages ? state.currentPage + 1 : 0;
    const label = `${currentDisplay} / ${total || 0}`;
    previewPager.textContent = label;
    responsePager.textContent = label;

    const disablePrev = !hasPages || state.currentPage === 0;
    const disableNext = !hasPages || state.currentPage >= total - 1;

    [previewPrev, responsePrev].forEach((btn) => (btn.disabled = disablePrev));
    [previewNext, responseNext].forEach((btn) => (btn.disabled = disableNext));
  };

  const ensureCurrentPageBounds = () => {
    const total = getTotalPages();
    if (!total) {
      state.currentPage = 0;
      return;
    }
    state.currentPage = Math.min(state.currentPage, total - 1);
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
      .map((page, idx) => (page ? `<!-- Page ${idx + 1} -->\n${page}` : ""))
      .filter(Boolean)
      .join(PAGE_BREAK);

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
    uploadButton.disabled = isLoading || !state.file;
    refreshButton.disabled = isLoading || !state.file;
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

  const renderResponse = (htmlInput) => {
    const pages = Array.isArray(htmlInput) ? htmlInput : [htmlInput];
    state.responsePages = pages.filter((page) => page !== undefined && page !== null);
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
      previewFile = file?.isMock ? file : createMockFile();
      state.previewPages = createMockPreviewPages(MOCK_PAGE_COUNT);
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
      updatePreviewMeta("", "");
      clearPreviewMedia();
      return;
    }

    const displayName = formatDisplayName(previewFile.name);
    const metaText = formatFileMeta(previewFile);
    state.previewName = displayName;
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
      if (USE_FAKE_API) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));
        htmlPages = createFakeHtmlPages(state.previewPages.length || MOCK_PAGE_COUNT);
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
      if (state.activeJobId === jobId) {
        toggleLoading(false);
        state.activeJobId = null;
      }
    }
  };

  const handleFile = async (file) => {
    const activeFile = state.mockMode ? createMockFile() : file;
    if (!activeFile) return;
    const jobId = createId();
    state.activeJobId = jobId;
    state.file = activeFile;
    state.currentPage = 0;
    setClearButtonState(false);
    await setPreview(activeFile);
    sendToApi(activeFile, jobId);
  };

  const clearFile = () => {
    state.file = null;
    fileInput.value = "";
    state.previewPages = [];
    state.previewName = "";
    state.previewMeta = "";
    state.currentPage = 0;
    state.activeJobId = null;
    setClearButtonState(true);
    uploadButton.disabled = true;
    refreshButton.disabled = true;
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
    } catch (err) {
      console.warn("Clipboard unavailable", err);
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
    const thumbnailSrc = entry.previewPages?.[0];
    if (thumbnailSrc) {
      const img = document.createElement("img");
      img.src = thumbnailSrc;
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

  const refreshHistoryList = () => {
    historyList.querySelectorAll(".history-item").forEach((item) => item.remove());
    historyEmptyMessage.hidden = state.history.length > 0;
    state.history.forEach((entry) => {
      historyList.appendChild(buildHistoryItem(entry));
    });
  };

  const addHistoryEntry = ({ file, pages, previewPages, isPdf }) => {
    const entry = {
      id: createId(),
      name: file.name,
      pages: pages.map((page) => page),
      previewPages: previewPages.map((src) => src),
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isPdf,
      fileMeta: state.previewMeta || formatFileMeta(file)
    };
    state.history = [entry, ...state.history].slice(0, 10);
    refreshHistoryList();
  };

  const loadHistoryEntry = (entryId) => {
    const entry = state.history.find((item) => item.id === entryId);
    if (!entry) return;
    state.previewPages = entry.previewPages ?? [];
    state.responsePages = entry.pages ?? [];
    state.previewName = formatDisplayName(entry.name);
    state.previewMeta = entry.fileMeta || "";
    state.currentPage = 0;
    updatePreviewMeta(state.previewName, state.previewMeta);
    renderPreviewPage();
    if (hasResponseContent()) {
      placeholder.hidden = true;
      renderResponsePage();
    } else {
      placeholder.hidden = false;
      responseContainer.innerHTML = "";
    }
    updateCopyButtonState();
    syncPager();
  };

  const clearHistory = () => {
    state.history = [];
    refreshHistoryList();
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
    updateCopyButtonState();
  };

  const init = () => {
    registerDragEvents();

    dropzone.addEventListener("click", () => {
      if (state.mockMode) {
        handleFile(null);
      } else {
        fileInput.click();
      }
    });

    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (state.mockMode) {
          handleFile(null);
        } else {
          fileInput.click();
        }
      }
    });

    browseButton.addEventListener("click", () => {
      if (state.mockMode) {
        handleFile(null);
      } else {
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      handleFile(file);
    });

    clearButton.addEventListener("click", () => {
      if (clearButton.getAttribute("aria-disabled") === "true") return;
      clearFile();
    });

    uploadButton.addEventListener("click", () => {
      if (!state.file || state.isLoading) return;
      const jobId = createId();
      state.activeJobId = jobId;
      sendToApi(state.file, jobId);
    });

    refreshButton.addEventListener("click", () => {
      if (!state.file || state.isLoading) return;
      const jobId = createId();
      state.activeJobId = jobId;
      sendToApi(state.file, jobId);
    });

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
    copyButton.disabled = true;
    setClearButtonState(true);
    setMockMode(state.mockMode);
    syncPager();
  };

  init();
})();
