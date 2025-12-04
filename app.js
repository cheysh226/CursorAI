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
  const MOCK_INPUT = encodeURI(`모의모드/input_test.jpg`);
  const ORIGINAL_RESULT_STYLE = `
body{margin:0;padding:10px;font-family:Arial,sans-serif;color:#111}
.container{position:relative;border:1px solid #ccc;background:#fff}
.block{position:absolute;border:1px solid #999;padding:2px;box-sizing:border-box;font-size:12px;line-height:1.2;background:#fff}
table{width:100%;border-collapse:collapse;font-size:11px}
td{border:1px solid #999;padding:2px;text-align:center}
`;
  const SCOPED_RESULT_STYLE = `
.result-html-root{margin:0;padding:10px;height:100%;box-sizing:border-box;font-family:Arial,sans-serif;overflow:auto;background:#fff;color:#111}
.result-html-root .container{position:relative;border:1px solid #ccc;background:#fff}
.result-html-root .block{position:absolute;border:1px solid #999;padding:2px;box-sizing:border-box;font-size:12px;line-height:1.2;background:#fff}
.result-html-root table{width:100%;border-collapse:collapse;font-size:11px}
.result-html-root td{border:1px solid #999;padding:2px;text-align:center}
`;
  const MOCK_BODY_HTML = `
  <div class="container" style="width:775px;height:877px">
    <div class="block paragraph_title" style="left:367px;top:4px;width:56px;height:29px;background:#f3e5f5">M14Ph2</div>
    <div class="block table" style="left:19px;top:28px;width:564px;height:703px;background:#e3f2fd">
      <table>
        <tr><td colspan="3">INSTITUT 7 919 IPS</td><td colspan="3">CPZR</td><td colspan="3">CPHF</td><td colspan="3">SP17</td></tr>
        <tr><td>34199</td><td>Cham</td><td>Batch</td><td>Bulk</td><td>Process</td><td>Batch</td><td>Bulk</td><td>Process</td><td>Batch</td><td>Bulk</td><td>Process</td><td></td></tr>
        <tr><td rowspan="2">4DSAB303</td><td>PM2</td><td>74</td><td>109</td><td>473</td><td>71</td><td>2.97</td><td>5.61</td><td>2</td><td>3.93</td><td>4.19</td><td></td></tr>
        <tr><td>PM3</td><td>74</td><td>109</td><td>473</td><td>71</td><td>2.97</td><td>5.93</td><td>2</td><td>3.93</td><td>4.19</td><td></td></tr>
        <tr><td rowspan="2">4DSAB305</td><td>PM2</td><td>2911</td><td>244</td><td>443</td><td>182</td><td>12.0</td><td>5.81</td><td>23.534</td><td>4.70</td><td>4.810</td><td></td></tr>
        <tr><td>PM3</td><td>3937</td><td>10.0</td><td>435</td><td>3969</td><td>4.2</td><td>6.03</td><td>53.85</td><td>0.75</td><td>5.46</td><td></td></tr>
        <tr><td rowspan="2">4DSAB401</td><td>PM2</td><td>19780</td><td>10.0</td><td>4152</td><td>2994</td><td>4.2</td><td>5.65</td><td>31935</td><td>0.75</td><td>5.46</td><td></td></tr>
        <tr><td>PM3</td><td>4637</td><td>10.0</td><td>449</td><td>4626</td><td>4.2</td><td>5.46</td><td>30915</td><td>0.75</td><td>5.46</td><td></td></tr>
        <tr><td rowspan="2">4DSAB402</td><td>PM2</td><td>311</td><td>20</td><td>3.36</td><td>310</td><td>5.14</td><td>5.60</td><td>6193</td><td>4.99</td><td>4.92</td><td></td></tr>
        <tr><td>PM3</td><td>2638</td><td>20</td><td>3.29</td><td>4902</td><td>5.14</td><td>5.56</td><td>12613</td><td>4.99</td><td>4.92</td><td></td></tr>
        <tr><td rowspan="2">4DSAB404</td><td>PM2</td><td>401</td><td>0.2</td><td>3.63</td><td>1599</td><td>3.8</td><td>5.99</td><td>28295</td><td>4.12</td><td>4.97</td><td></td></tr>
        <tr><td>PM3</td><td>794</td><td>0.2</td><td>3.04</td><td>3272</td><td>3.8</td><td>6.25</td><td>30444</td><td>4.12</td><td>4.97</td><td></td></tr>
        <tr><td rowspan="2">4DSAB412</td><td>PM2</td><td>4615</td><td>0.5</td><td>3.89</td><td>4606</td><td>13.8</td><td>5.59</td><td>21611</td><td>4.51</td><td>4.90</td><td></td></tr>
        <tr><td>PM3</td><td>3866</td><td>0.5</td><td>415</td><td>4291</td><td>13.8</td><td>5.80</td><td>29339</td><td>4.51</td><td>4.90</td><td></td></tr>
        <tr><td rowspan="2">4DSAB413</td><td>PM2</td><td>3954</td><td>9.93</td><td>4.73</td><td>3936</td><td>2.0</td><td>5.32</td><td>20929</td><td>4.87</td><td>4.99</td><td></td></tr>
        <tr><td>PM3</td><td>2506</td><td>9.93</td><td>4.41</td><td>4990</td><td>2.0</td><td>5.44</td><td>28931</td><td>4.87</td><td>4.99</td><td></td></tr>
        <tr><td rowspan="2">4DSAB604</td><td>PM2</td><td>970</td><td>0.7</td><td>3.24</td><td>969</td><td>14.5</td><td>5.35</td><td>7921</td><td>5.32</td><td>4.92</td><td></td></tr>
        <tr><td>PM3</td><td>3787</td><td>0.7</td><td>3.86</td><td>1236</td><td>14.5</td><td>5.35</td><td>7167</td><td>5.32</td><td>4.92</td><td></td></tr>
        <tr><td rowspan="2">4DSAB605</td><td>PM2</td><td>3605</td><td>1.03</td><td>4.13</td><td>3609</td><td>5.17</td><td>5.54</td><td>7301</td><td>4.03</td><td>4.94</td><td></td></tr>
        <tr><td>PM3</td><td>1221</td><td>1.03</td><td>4.0</td><td>1225</td><td>5.17</td><td>5.96</td><td>6243</td><td>4.03</td><td>4.94</td><td></td></tr>
        <tr><td rowspan="2">4DSAB606</td><td>PM2</td><td>65</td><td>16.1</td><td>4.21</td><td>64</td><td>1.94</td><td>5.90</td><td>75</td><td>3.63</td><td>4.90</td><td></td></tr>
        <tr><td>PM3</td><td>429</td><td>16.1</td><td>4.15</td><td>425</td><td>1.94</td><td>6.06</td><td>519</td><td>3.63</td><td>4.90</td><td></td></tr>
        <tr><td rowspan="2">4DSAB801</td><td>PM1</td><td>224</td><td>12.9</td><td>4.41</td><td>4.18</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>PM2</td><td>2650</td><td>12.9</td><td>4.78</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td rowspan="2">4DSAB804</td><td>PM2</td><td>2831</td><td>9.6</td><td>4.44</td><td>4463</td><td>16.6</td><td>5.64</td><td>15201</td><td>4.77</td><td>4.77</td><td></td></tr>
        <tr><td>PM3</td><td>2455</td><td>9.6</td><td>4.31</td><td>4933</td><td>16.6</td><td>5.63</td><td>14691</td><td>4.77</td><td>4.77</td><td></td></tr>
        <tr><td rowspan="2">4DSAB805</td><td>PM2</td><td>2814</td><td>8.0</td><td>4.42</td><td>4192</td><td>4.4</td><td>5.60</td><td>4962</td><td>10.77</td><td>4.75</td><td></td></tr>
        <tr><td>PM3</td><td>422</td><td>8.0</td><td>4.73</td><td>818</td><td>4.4</td><td>3.95</td><td>4581</td><td>10.77</td><td>4.75</td><td></td></tr>
      </table>
    </div>
    <div class="block table" style="left:587px;top:32px;width:193px;height:850px;background:#e3f2fd">
      <table>
        <tr><td colspan="4">BTBAS(Dram)</td></tr>
        <tr><td>引引号</td><td>Cham</td><td>Bulk</td><td>Process</td></tr>
        <tr><td rowspan="2">4DSLB403</td><td>PM2</td><td rowspan="2">10.91</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLB802</td><td>PM2</td><td rowspan="2">6.29</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4EKGD102</td><td>PM1</td><td rowspan="2">4.26</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM2</td></tr>
        <tr><td rowspan="2">4DSLE501</td><td>PM2</td><td rowspan="2">4.97</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE502</td><td>PM2</td><td rowspan="2">8.90</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE622</td><td>PM2</td><td rowspan="2">6.43</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE702</td><td>PM2</td><td rowspan="2">6.69</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE703</td><td>PM2</td><td rowspan="2">2.79</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE704</td><td>PM2</td><td rowspan="2">2.82</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE706</td><td>PM2</td><td rowspan="2">4.05</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE707</td><td>PM2</td><td rowspan="2">8.24</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE708</td><td>PM2</td><td rowspan="2">11.92</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DSLE709</td><td>PM2</td><td rowspan="2">0.29</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DCLE712</td><td>PM2</td><td rowspan="2">9.55</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DCLE801</td><td>PM2</td><td rowspan="2">4.34</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
        <tr><td rowspan="2">4DCLE802</td><td>PM2</td><td rowspan="2">10.91</td><td rowspan="2">10.95</td></tr>
        <tr><td>PM3</td></tr>
      </table>
    </div>
    <div class="block header" style="left:686px;top:8px;width:72px;height:26px;background:#fff3e0">2025년 11월 26일</div>
  </div>
</body>
</html>`;
  const buildHtmlDocument = (bodyHTML) =>
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${ORIGINAL_RESULT_STYLE}</style></head><body>${bodyHTML}</body></html>`;
  const MOCK_DEFAULT_PAGES = [buildHtmlDocument(MOCK_BODY_HTML)];

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
      updateCopyState();
    };

    editor.addEventListener("input", persistChanges);
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
    if (uploadButton) uploadButton.disabled = disabled;
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
    if (uploadButton) uploadButton.disabled = true;
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
    if (responseRetryButton) {
      responseRetryButton.addEventListener("click", triggerReanalysis);
    }

    copyButton.addEventListener("click", handleCopy);
    clearHistoryButton.addEventListener("click", clearHistory);
    mockToggleButton.addEventListener("click", () => setMockMode(!state.mockMode));

    previewPrev.addEventListener("click", () => changePage(-1));
    previewNext.addEventListener("click", () => changePage(1));
    responsePrev.addEventListener("click", () => changePage(-1));
    responseNext.addEventListener("click", () => changePage(1));

    if (uploadButton) uploadButton.disabled = true;
    refreshButton.disabled = true;
    if (responseRetryButton) responseRetryButton.disabled = true;
    copyButton.disabled = true;
    setClearButtonState(true);
    setMockMode(state.mockMode);
    syncPager();
  };

  init();
})();
