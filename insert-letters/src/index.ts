import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 80;

app.use(bodyParser.json({ limit: '10mb' }));

// Function to add vertical text with center alignment
const addVerticalTextWithCenter = (image: Jimp, text: string, font: any, startX: number, startY: number, maxWidth: number, maxHeight: number) => {
  const chars = text.split('');
  const charWidth = Jimp.measureText(font, chars[0]);
  const charHeight = Jimp.measureTextHeight(font, chars[0], charWidth);

  // Calculate how many lines are needed and the total width of the text block
  let lines: string[] = [];
  let line = '';

  // Calculate vertical lines (columns) and their widths
  for (let char of chars) {
    const testLine = line + char;
    const width = Jimp.measureText(font, testLine);
    if (width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  // Calculate total text block width
  const textBlockWidth = lines.length * charWidth;

  // Calculate starting x position for center alignment
  let currentX = startX + textBlockWidth / 2 + charWidth / 2;
  let currentY = startY;

  // Draw the text
  for (const line of lines) {
    for (const char of line) {
      if (currentY + charHeight > startY + maxHeight) {
        // If text exceeds the maxHeight, wrap to next line
        currentY = startY;
        currentX -= charWidth;  // Move left for new vertical column
      }
      image.print(font, currentX, currentY, char);
      currentY += charHeight;
    }
    // Move to the next vertical column
    currentY = startY;
    currentX -= charWidth;
  }
};

app.post('/add-label', async (req: Request, res: Response) => {
  const { image: base64Image, label, font } = req.body;

  const vertical = true;
  const x = 187.5;
  const y = 150;
  const maxWidth = 400;
  const maxHeight = 400;

  if (!base64Image || !label) {
    return res.status(400).json({ error: 'Image and label are required.' });
  }

  try {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const loadedImage = await Jimp.read(imageBuffer);

    // Load the font
    let fontPath: string;
    switch (font) {
      case 'sans':
        fontPath = Jimp.FONT_SANS_32_BLACK;
        break;
      case 'serif':
        fontPath = Jimp.FONT_SANS_32_WHITE;
        break;
      default:
        fontPath = path.join(__dirname, 'fonts', `font.fnt`);
        break;
    }
    const loadedFont = await Jimp.loadFont(fontPath);

    // Add vertical text with center alignment
    addVerticalTextWithCenter(loadedImage, label, loadedFont, x, y, maxWidth, maxHeight);

    // Save the image
    const outputPath = path.join(__dirname, 'output', `image-${Date.now()}.png`);
    await loadedImage.writeAsync(outputPath);

    // Respond with the image URL
    // const imageUrl = `${req.protocol}://${req.get('host')}/images/${path.basename(outputPath)}`;
    const imageUrl = `${req.protocol}://localhost:8001/images/${path.basename(outputPath)}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process the image.' });
  }
});

app.use('/images', express.static(path.join(__dirname, 'output')));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
