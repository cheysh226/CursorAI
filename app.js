(() => {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseButton = document.getElementById("browseButton");
  const clearButton = document.getElementById("clearButton");
  const uploadButton = document.getElementById("uploadButton");
  const refreshButton = document.getElementById("refreshButton");
  const copyButton = document.getElementById("copyButton");
  const queuedFile = document.getElementById("queuedFile");
  const fileNameEl = document.getElementById("fileName");
  const fileMetaEl = document.getElementById("fileMeta");
  const spinner = document.getElementById("spinner");
  const spinnerLabel = spinner ? spinner.querySelector("span:last-child") : null;
  const placeholder = document.getElementById("placeholder");
  const responseContainer = document.getElementById("responseContainer");
  const errorTemplate = document.getElementById("errorTemplate");

  const API_ENDPOINT = 
    document.body.dataset?.apiEndpoint || "/api/documents/parse";

  const state = {
    file: null,
    isLoading: false,
    lastResponse: ""
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB"];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const setQueuedFile = (file) => {
    if (!file) {
      queuedFile.hidden = true;
      clearButton.setAttribute("aria-disabled", "true");
      uploadButton.disabled = true;
      return;
    }

    fileNameEl.textContent = file.name;
    fileMetaEl.textContent = `${file.type || "알 수 없음"} · ${formatBytes(file.size)}`;
    queuedFile.hidden = false;
    clearButton.setAttribute("aria-disabled", "false");
    uploadButton.disabled = false;
  };

  const toggleLoading = (isLoading, message = "분석 중...") => {
    state.isLoading = isLoading;
    if (!spinner) return;
    spinner.hidden = !isLoading;
    if (spinnerLabel) {
      spinnerLabel.textContent = message;
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

  const sanitizeHtml = (htmlString) => {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    template.content.querySelectorAll("script").forEach((el) => el.remove());
    return template.content.cloneNode(true);
  };

  const renderResponse = (htmlString) => {
    if (!htmlString) {
      resetResponseView();
      return;
    }
    responseContainer.innerHTML = "";
    responseContainer.appendChild(sanitizeHtml(htmlString));
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

  const sendToApi = async (file) => {
    if (!file) return;
    toggleLoading(true, `${file.name} 분석 중...`);
    placeholder.hidden = true;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "text/html"
        }
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const html = await response.text();
      renderResponse(html);
    } catch (error) {
      console.error("Upload failed", error);
      renderError();
    } finally {
      toggleLoading(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    state.file = file;
    setQueuedFile(file);
    sendToApi(file);
  };

  const clearFile = () => {
    state.file = null;
    fileInput.value = "";
    setQueuedFile(null);
    resetResponseView();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
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

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });

    browseButton.addEventListener("click", () => fileInput.click());

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
      sendToApi(state.file);
    });

    refreshButton.addEventListener("click", () => {
      if (!state.file || state.isLoading) return;
      sendToApi(state.file);
    });

    copyButton.addEventListener("click", handleCopy);
  };

  init();
})();
