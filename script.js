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

    // Debug: Check if textarea element is found
    if (!this.extractedText) {
      console.error("Textarea element 'extractedText' not found!");
    } else {
      console.log("Textarea element found successfully");
    }
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
      // Initialize Tesseract worker with advanced configuration for better text detection
      this.updateProgress(10, "Initializing advanced OCR engine...");

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

      // Configure Tesseract for better handling of scattered text
      await this.worker.setParameters({
        tessedit_pageseg_mode: "11", // Sparse text mode for scattered text
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-:;()[]{}\"'/\\@#$%^&*+=<>|`~",
        preserve_interword_spaces: "1",
      });

      // Process the image with advanced text detection
      this.updateProgress(30, "Analyzing text layout...");

      const { data } = await this.worker.recognize(this.currentFile);

      this.updateProgress(70, "Processing scattered text...");

      // Enhanced text processing for zigzag and random positioning
      const processedText = await this.processScatteredText(data);

      this.updateProgress(100, "Processing complete!");

      // Debug logging
      console.log("OCR Data:", data);
      console.log("Processed Text:", processedText);
      console.log("Raw Text:", data.text);

      // Display results with fallback
      setTimeout(() => {
        const finalText =
          processedText ||
          data.text ||
          "No text detected in the image. Please try with a clearer image or check if the image contains readable text.";
        this.displayResults(finalText);
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

  async processScatteredText(data) {
    try {
      console.log("Processing scattered text, data:", data);

      // First try to get basic text
      const basicText = data.text || "";

      // Extract words with their positions
      const words = data.words || [];
      console.log("Found words:", words.length);

      if (words.length === 0) {
        console.log("No words found, returning basic text:", basicText);
        return basicText;
      }

      // Sort words by their spatial relationships for better reading order
      const sortedWords = this.spatialTextSort(words);
      console.log("Sorted words:", sortedWords.length);

      // Simple reconstruction - join words with spaces
      const reconstructedText = sortedWords
        .map((word) => word.text)
        .filter((text) => text && text.trim().length > 0)
        .join(" ");

      console.log("Reconstructed text:", reconstructedText);

      // Return the better of the two texts
      const finalText = reconstructedText.trim() || basicText.trim();
      return this.cleanupExtractedText(finalText);
    } catch (error) {
      console.warn("Advanced text processing failed, using basic text:", error);
      return data.text || "";
    }
  }

  spatialTextSort(words) {
    try {
      // Create a copy of words with enhanced position data
      const wordsWithMetrics = words.map((word) => {
        // Handle different bbox formats safely
        const bbox = word.bbox || {};
        const x0 = bbox.x0 || 0;
        const y0 = bbox.y0 || 0;
        const x1 = bbox.x1 || 0;
        const y1 = bbox.y1 || 0;

        return {
          ...word,
          centerX: x0 + (x1 - x0) / 2,
          centerY: y0 + (y1 - y0) / 2,
          width: x1 - x0,
          height: y1 - y0,
        };
      });

      // Sort for better text flow: top to bottom, left to right
      return wordsWithMetrics.sort((a, b) => {
        // Primary sort: Top to bottom (with tolerance for same line)
        const yTolerance = Math.max(a.height, b.height) * 0.5;
        const yDiff = a.centerY - b.centerY;

        if (Math.abs(yDiff) > yTolerance) {
          return yDiff; // Different lines
        }

        // Secondary sort: Left to right for same line
        return a.centerX - b.centerX;
      });
    } catch (error) {
      console.warn("Spatial sorting failed, returning original words:", error);
      return words;
    }
  }

  cleanupExtractedText(text) {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Fix common OCR errors
        .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between lowercase and uppercase
        .replace(/(\d)([A-Za-z])/g, "$1 $2") // Add space between numbers and letters
        .replace(/([A-Za-z])(\d)/g, "$1 $2") // Add space between letters and numbers
        // Clean up line breaks
        .replace(/\n\s*\n/g, "\n")
        .trim()
    );
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
    console.log("Displaying results:", text);
    const finalText = text.trim();

    if (!finalText) {
      console.warn("Empty text received, showing fallback message");
      this.extractedText.value =
        "No text was detected in the image. Please try:\n\n• Using a clearer, higher resolution image\n• Ensuring good contrast between text and background\n• Making sure the text is not too small or blurry\n• Checking that the image actually contains readable text";
    } else {
      this.extractedText.value = finalText;
    }

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
