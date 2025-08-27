class OCRApp {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.worker = null;
  }

  initializeElements() {
    this.uploadArea = document.getElementById("uploadArea");
    this.imageInput = document.getElementById("imageInput");
    this.browseBtn = document.querySelector(".browse-btn");
    this.previewSection = document.getElementById("previewSection");
    this.imagePreview = document.getElementById("imagePreview");
    this.processBtn = document.getElementById("processBtn");
    this.progressSection = document.getElementById("progressSection");
    this.progressFill = document.getElementById("progressFill");
    this.progressText = document.getElementById("progressText");
    this.resultsSection = document.getElementById("resultsSection");
    this.extractedText = document.getElementById("extractedText");
    this.copyBtn = document.getElementById("copyBtn");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.clearBtn = document.getElementById("clearBtn");
  }

  setupEventListeners() {
    // File upload events
    this.uploadArea.addEventListener("click", () => this.imageInput.click());
    this.browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.imageInput.click();
    });
    this.imageInput.addEventListener("change", (e) => this.handleFileSelect(e));

    // Drag and drop events
    this.uploadArea.addEventListener("dragover", (e) => this.handleDragOver(e));
    this.uploadArea.addEventListener("dragleave", (e) =>
      this.handleDragLeave(e)
    );
    this.uploadArea.addEventListener("drop", (e) => this.handleDrop(e));

    // Process button
    this.processBtn.addEventListener("click", () => this.processImage());

    // Action buttons
    this.copyBtn.addEventListener("click", () => this.copyText());
    this.downloadBtn.addEventListener("click", () => this.downloadText());
    this.clearBtn.addEventListener("click", () => this.clearResults());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadArea.classList.add("dragover");
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadArea.classList.remove("dragover");
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadArea.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      this.displayImage(files[0]);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      this.displayImage(file);
    }
  }

  displayImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.src = e.target.result;
      this.previewSection.style.display = "block";
      this.hideResults();
    };
    reader.readAsDataURL(file);
    this.currentFile = file;
  }

  async processImage() {
    if (!this.currentFile) return;

    this.showProgress();
    this.processBtn.disabled = true;

    try {
      // Initialize Tesseract worker with proper configuration
      this.updateProgress(10, "Initializing OCR engine...");

      this.worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === "recognizing text") {
            const progress = Math.round(30 + m.progress * 60);
            this.updateProgress(
              progress,
              `Recognizing text... ${Math.round(m.progress * 100)}%`
            );
          }
        },
      });

      await this.worker.loadLanguage("eng");
      await this.worker.initialize("eng");

      // Process the image
      this.updateProgress(30, "Processing image...");

      const {
        data: { text },
      } = await this.worker.recognize(this.currentFile);

      this.updateProgress(100, "Processing complete!");

      // Display results
      setTimeout(() => {
        this.displayResults(text);
        this.hideProgress();
      }, 500);
    } catch (error) {
      console.error("OCR Error:", error);
      this.updateProgress(0, "Error processing image. Please try again.");
      setTimeout(() => this.hideProgress(), 2000);
    } finally {
      this.processBtn.disabled = false;
      if (this.worker) {
        try {
          await this.worker.terminate();
        } catch (e) {
          console.warn("Worker termination error:", e);
        }
        this.worker = null;
      }
    }
  }

  updateProgress(percentage, message) {
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = message;
  }

  showProgress() {
    this.progressSection.style.display = "block";
    this.hideResults();
  }

  hideProgress() {
    this.progressSection.style.display = "none";
  }

  displayResults(text) {
    this.extractedText.value = text.trim();
    this.resultsSection.style.display = "block";

    // Scroll to results
    this.resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  hideResults() {
    this.resultsSection.style.display = "none";
  }

  async copyText() {
    try {
      await navigator.clipboard.writeText(this.extractedText.value);
      this.showToast("Text copied to clipboard!");
    } catch (error) {
      // Fallback for older browsers
      this.extractedText.select();
      document.execCommand("copy");
      this.showToast("Text copied to clipboard!");
    }
  }

  downloadText() {
    const text = this.extractedText.value;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted-text-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Text file downloaded!");
  }

  clearResults() {
    this.extractedText.value = "";
    this.hideResults();
    this.previewSection.style.display = "none";
    this.imageInput.value = "";
    this.currentFile = null;
  }

  showToast(message) {
    // Create toast notification
    const toast = document.createElement("div");
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-size: 0.9rem;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = "translateX(0)";
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new OCRApp();
});
