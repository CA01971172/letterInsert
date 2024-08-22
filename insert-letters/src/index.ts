import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 80;

app.use(bodyParser.json({ limit: '10mb' })); // base64の画像を大きいサイズでも扱えるようにする

app.post('/add-label', async (req: Request, res: Response) => {
  const { image, label, font } = req.body;

  if (!image || !label) {
    return res.status(400).json({ error: 'Image, label, and font are required.' });
  }

  try {
    const imageBuffer = Buffer.from(image, 'base64');
    const loadedImage = await Jimp.read(imageBuffer);

    // フォントのロード。指定されたフォントを使用
    let fontPath: string;
    switch (font) {
      case 'sans':
        fontPath = Jimp.FONT_SANS_32_BLACK;
        break;
      case 'serif':
        fontPath = Jimp.FONT_SANS_32_WHITE;
        break;
      default:
        fontPath = Jimp.FONT_SANS_32_BLACK;
        break;
    }
    const loadedFont = await Jimp.loadFont(fontPath);

    // 画像にラベルを追加
    loadedImage.print(loadedFont, 10, 10, label);

    // 画像を保存
    const outputPath = path.join(__dirname, 'output', `image-${Date.now()}.png`);
    await loadedImage.writeAsync(outputPath);

    // クライアントに画像のパスを返す
    const imageUrl = `${req.protocol}://${req.get('host')}/images/${path.basename(outputPath)}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process the image.' });
  }
});

// 静的ファイルの提供
app.use('/images', express.static(path.join(__dirname, 'output')));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
