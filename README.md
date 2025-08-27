# OCR Text Reader

A modern web application for extracting text from images using Optical Character Recognition (OCR) technology.

## Features

- **Drag & Drop Interface**: Simply drag images onto the upload area
- **Multiple Image Formats**: Supports JPG, PNG, GIF, and other common image formats
- **Real-time Progress**: Visual progress indicator during text extraction
- **Text Management**: Copy extracted text to clipboard or download as TXT file
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Client-side Processing**: All OCR processing happens in your browser for privacy

## How to Use

1. **Upload an Image**:

   - Drag and drop an image file onto the upload area, or
   - Click "Browse Files" to select an image from your device

2. **Extract Text**:

   - Click the "Extract Text" button to start the OCR process
   - Wait for the processing to complete (progress will be shown)

3. **Use the Results**:
   - Copy the extracted text to your clipboard
   - Download the text as a .txt file
   - Clear results to process another image

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **OCR Engine**: Tesseract.js (WebAssembly-based OCR)
- **Styling**: Modern CSS with gradients and animations
- **No Backend Required**: Runs entirely in the browser

## Getting Started

1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. Start uploading images and extracting text!

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Privacy

All image processing happens locally in your browser. No images or extracted text are sent to external servers, ensuring your data remains private and secure.

## File Structure

```
ocr-text-reader/
├── index.html          # Main HTML file
├── styles.css          # Styling and layout
├── script.js           # Application logic
└── README.md           # This file
```

## Tips for Better OCR Results

- Use high-resolution images when possible
- Ensure good contrast between text and background
- Avoid blurry or distorted images
- Text should be clearly visible and not too small
- Works best with printed text rather than handwritten text
