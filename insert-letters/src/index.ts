import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 80;

app.use(bodyParser.json({ limit: '10mb' }));

// Function to wrap text
const wrapText = (text: string, font: any, maxWidth: number) => {
  const lines: string[] = [];
  let line = '';

  text.split(' ').forEach(word => {
    const testLine = line + (line ? ' ' : '') + word;
    const width = Jimp.measureText(font, testLine);
    if (width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
};

// Function to add vertical text
const addVerticalText = (image: Jimp, text: string, font: any, x: number, y: number) => {
  const chars = text.split('');
  const charWidth = Jimp.measureText(font, chars[0]);
  const charHeight = Jimp.measureTextHeight(font, chars[0], charWidth);

  chars.forEach((char, index) => {
    image.print(font, x, y + (charHeight * index), char);
  });
};

app.post('/add-label', async (req: Request, res: Response) => {
  const { image: base64Image, label, font } = req.body;

  const vertical = true
  const x = 275
  const y = 150
  const maxWidth = 100

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

    // Wrap text if maxWidth is specified
    const wrappedText = maxWidth ? wrapText(label, loadedFont, maxWidth) : [label];

    // Calculate text positioning
    const textHeight = wrappedText.length * Jimp.measureTextHeight(loadedFont, wrappedText[0], maxWidth);
    const imageWidth = loadedImage.bitmap.width;
    const imageHeight = loadedImage.bitmap.height;

    let textY = y || (imageHeight - textHeight) / 2;

    // Add the text to the image
    if (vertical) {
      addVerticalText(loadedImage, label, loadedFont, x || (imageWidth - Jimp.measureText(loadedFont, label)) / 2, textY);
    } else {
      wrappedText.forEach((line, index) => {
        loadedImage.print(loadedFont, x || (imageWidth - Jimp.measureText(loadedFont, line)) / 2, textY + index * Jimp.measureTextHeight(loadedFont, line, maxWidth), line);
      });
    }

    // Save the image
    const outputPath = path.join(__dirname, 'output', `image-${Date.now()}.png`);
    await loadedImage.writeAsync(outputPath);

    // Respond with the image URL
    const imageUrl = `${req.protocol}://${req.get('host')}/images/${path.basename(outputPath)}`;
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
