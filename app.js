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
  const spinner = document.getElementById("spinner");
  const spinnerLabel = spinner ? spinner.querySelector("span:last-child") : null;
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
  const MOCK_IMAGE_DATA =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236c7bff'/%3E%3Cstop offset='100%25' stop-color='%235de0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='24' fill='%230d1020'/%3E%3Cpath d='M64 160h112M64 120h64M64 80h48' stroke='url(%23g)' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";

  const createId = () =>
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const state = {
    file: null,
    isLoading: false,
    lastResponse: "",
    history: [],
    previewSource: null,
    previewMeta: "",
    mockMode: DEFAULT_MOCK_MODE,
    activeJobId: null
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

  const setMockMode = (enabled) => {
    state.mockMode = enabled;
    if (mockToggleButton) {
      mockToggleButton.textContent = enabled ? "모의 모드 켜짐" : "모의 모드 꺼짐";
      mockToggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
    }
    dropzone.classList.toggle("is-mock", enabled);
    clearFile();
  };

  const updatePreviewUI = ({ name, meta, previewSource, isPdf }) => {
    if (!name && !meta) {
      previewShell.hidden = true;
      previewImage.removeAttribute("src");
      previewPdf.hidden = true;
      return;
    }

    previewShell.hidden = false;
    fileNameEl.textContent = name;
    fileMetaEl.textContent = meta;

    if (previewSource) {
      previewImage.src = previewSource;
      previewImage.hidden = false;
      previewPdf.hidden = true;
    } else {
      previewImage.removeAttribute("src");
      previewImage.hidden = true;
      previewPdf.hidden = false;
      previewPdf.textContent = isPdf ? "PDF" : "FILE";
    }
  };

  const setClearButtonState = (disabled) => {
    clearButton.setAttribute("aria-disabled", disabled ? "true" : "false");
    clearButton.disabled = disabled;
  };

  const readAsDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });

  const setPreview = async (file) => {
    if (state.mockMode) {
      const mockFile = file?.isMock ? file : createMockFile();
      const metaText = formatFileMeta(mockFile);
      updatePreviewUI({
        name: mockFile.name,
        meta: metaText,
        previewSource: MOCK_IMAGE_DATA,
        isPdf: false
      });
      state.previewSource = MOCK_IMAGE_DATA;
      state.previewMeta = metaText;
      return;
    }

    if (!file) {
      updatePreviewUI({ name: "", meta: "", previewSource: null, isPdf: false });
      state.previewSource = null;
      state.previewMeta = "";
      return;
    }

    const metaText = formatFileMeta(file);
    let previewSource = null;
    let isPdf = false;
    if (file.type.startsWith("image/")) {
      const dataUrl = await readAsDataUrl(file);
      previewSource = dataUrl;
    } else {
      isPdf = file.type.includes("pdf");
    }

    updatePreviewUI({
      name: formatDisplayName(file.name),
      meta: metaText,
      previewSource,
      isPdf
    });

    state.previewSource = previewSource;
    state.previewMeta = metaText;
  };

  const toggleLoading = (isLoading, message = "분석 중...") => {
    state.isLoading = isLoading;
    if (spinner) {
      spinner.hidden = !isLoading;
      if (spinnerLabel) spinnerLabel.textContent = message;
    }
    uploadButton.disabled = isLoading || !state.file;
    refreshButton.disabled = isLoading || !state.file;
    copyButton.disabled = isLoading || !state.lastResponse;
  };

  const resetResponseView = () => {
    placeholder.hidden = false;
    responseContainer.innerHTML = "";
    state.lastResponse = "";
    copyButton.disabled = true;
  };

  const renderResponse = (htmlString) => {
    if (!htmlString) {
      resetResponseView();
      return;
    }
    responseContainer.innerHTML = htmlString;
    placeholder.hidden = true;
    copyButton.disabled = false;
    state.lastResponse = htmlString;
  };

  const renderError = () => {
    responseContainer.innerHTML = "";
    if (errorTemplate) {
      responseContainer.appendChild(errorTemplate.content.cloneNode(true));
    } else {
      responseContainer.textContent = "요청 중 오류가 발생했습니다.";
    }
    placeholder.hidden = true;
    copyButton.disabled = true;
  };

  const createFakeHtml = () => {
    return `
      <section>
        <h3>필드 추출 미리보기</h3>
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
              <td>거래 내역 요약</td>
              <td>0.93</td>
            </tr>
            <tr>
              <td>문서 유형</td>
              <td>Invoice</td>
              <td>0.88</td>
            </tr>
            <tr>
              <td>페이지 수</td>
              <td>1</td>
              <td>0.74</td>
            </tr>
          </tbody>
        </table>
        <p class="muted">※ 현재는 PoC용 예시 데이터가 표시됩니다.</p>
      </section>
    `;
  };

  const sendToApi = async (file, jobId = createId()) => {
    if (!file) return;
    const displayName = formatDisplayName(file.name);
    toggleLoading(true, `PoC · ${displayName} 분석 중...`);
    placeholder.hidden = true;

    try {
      let html;
      if (USE_FAKE_API) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));
        html = createFakeHtml();
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          body: formData,
          headers: { Accept: "text/html" }
        });
        if (!response.ok) throw new Error(`API responded with ${response.status}`);
        html = await response.text();
      }

      if (state.activeJobId === jobId) {
        renderResponse(html);
        addHistoryEntry({
          file,
          html,
          previewSource: state.previewSource,
          isPdf: !file.type.startsWith("image/") && file.type.includes("pdf")
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
    setClearButtonState(false);
    await setPreview(activeFile);
    sendToApi(activeFile, jobId);
  };

  const clearFile = () => {
    state.file = null;
    fileInput.value = "";
    updatePreviewUI({ name: "", meta: "", previewSource: null, isPdf: false });
    setClearButtonState(true);
    uploadButton.disabled = true;
    refreshButton.disabled = true;
    state.previewSource = null;
    state.previewMeta = "";
    state.activeJobId = null;
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
    if (entry.previewSource) {
      const img = document.createElement("img");
      img.src = entry.previewSource;
      img.alt = `${entry.name} thumbnail`;
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
    metaEl.textContent = `${entry.timestamp} · ${entry.fileMeta || entry.status}`;
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

  const addHistoryEntry = ({ file, html, previewSource, isPdf }) => {
    const entry = {
      id: createId(),
      name: file.name,
      html,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      status: "완료",
      previewSource,
      isPdf,
      fileMeta: state.previewMeta || formatFileMeta(file)
    };
    state.history = [entry, ...state.history].slice(0, 10);
    refreshHistoryList();
  };

  const loadHistoryEntry = (entryId) => {
    const entry = state.history.find((item) => item.id === entryId);
    if (!entry) return;
    renderResponse(entry.html);
    updatePreviewUI({
      name: entry.name,
      meta: entry.fileMeta || "",
      previewSource: entry.previewSource,
      isPdf: entry.isPdf
    });
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

    uploadButton.disabled = true;
    refreshButton.disabled = true;
    copyButton.disabled = true;
    setClearButtonState(true);
    setMockMode(state.mockMode);
  };

  init();
})();
