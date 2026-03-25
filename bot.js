const TelegramBot = require("node-telegram-bot-api");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const express = require("express");

// 🔐 SET YOUR TOKEN HERE
const TOKEN = process.env.BOT_TOKEN || "8655558011:AAHmrtqeLOk9rMwstChUCGMUVYbA_UlTplU";

const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
const PORT = process.env.PORT || 3000;

// Create folders
const downloadDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

// 🧠 OCR FUNCTION
async function extractText(imagePath) {
  const { data: { text } } = await Tesseract.recognize(imagePath, "eng");
  return text;
}

// 📸 Handle Images
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Get highest quality image
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;

    const fileLink = await bot.getFileLink(fileId);

    const filePath = path.join(downloadDir, `${fileId}.jpg`);

    // Download image
    const response = await axios({
      url: fileLink,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", async () => {

      const text = await extractText(filePath);

      // Send result
      if (text.trim().length === 0) {
        await bot.sendMessage(chatId, "❗ No text found.");
      } else {
        await bot.sendMessage(chatId, "✅ Text extracted:");
        await bot.sendMessage(chatId, text.substring(0, 4000));
      }

      // Cleanup
      fs.unlinkSync(filePath);
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error processing image");
  }
});

// 👋 Start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "👋 Send me images (even multiple one by one), and I'll convert them to text!"
  );
});

// 🌐 Web server for uptime (Render needs this)
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
