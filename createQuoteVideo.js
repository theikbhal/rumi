const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Create directories
const outputDir = path.join(__dirname, 'output');
const screenshotsDir = path.join(outputDir, 'screenshots');
fs.ensureDirSync(outputDir);
fs.ensureDirSync(screenshotsDir);

// Read and convert background image to base64
const backgroundImagePath = path.join(__dirname, 'images', 'pexels-photo-24243721.png');
const backgroundImageBase64 = fs.readFileSync(backgroundImagePath, { encoding: 'base64' });

// HTML template for quotes
function generateQuoteHTML(quote, author) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                margin: 0;
                padding: 0;
                min-height: 100vh;
                font-family: 'Arial', sans-serif;
                position: relative;
            }
            .background-image {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('data:image/png;base64,${backgroundImageBase64}');
                background-size: cover;
                background-position: center;
                z-index: 1;
            }
            .black-rectangle {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 1000px;
                background-color: rgba(0, 0, 0, 0.85);
                padding: 3rem;
                border-radius: 10px;
                z-index: 2;
            }
            .quote-container {
                text-align: center;
                color: white;
                position: relative;
                z-index: 3;
            }
            .quote {
                font-size: 2.5rem;
                line-height: 1.4;
                margin-bottom: 2rem;
                font-weight: 300;
            }
            .author {
                font-size: 1.5rem;
                font-style: italic;
                color: #ffd700;
            }
        </style>
    </head>
    <body>
        <div class="background-image"></div>
        <div class="black-rectangle">
            <div class="quote-container">
                <div class="quote">${quote}</div>
                <div class="author">- ${author}</div>
            </div>
        </div>
    </body>
    </html>
    `;
}

async function takeScreenshot(html, index) {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Update this path to your Chrome installation
        headless: 'new'
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setContent(html);
        
        const screenshotPath = path.join(screenshotsDir, `quote_${index.toString().padStart(3, '0')}.png`);
        await page.screenshot({ path: screenshotPath, type: 'png' });
        console.log(`Screenshot taken: ${screenshotPath}`);
        
        return screenshotPath;
    } finally {
        await browser.close();
    }
}

async function createVideo() {
    try {
        // Read quotes from JSON
        const quotes = await fs.readJson(path.join(__dirname, 'rumi_quotes.json'));
        
        // Generate HTML and take screenshots for each quote
        const screenshotPaths = [];
        for (let i = 0; i < quotes.length; i++) {
            const { quote, author } = quotes[i];
            const html = generateQuoteHTML(quote, author);
            const screenshotPath = await takeScreenshot(html, i);
            screenshotPaths.push(screenshotPath);
        }

        // Create video from screenshots
        const outputVideoPath = path.join(outputDir, 'rumi_quotes.mp4');
        
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(screenshotsDir, 'quote_%03d.png'))
                .inputOptions(['-framerate 1/5']) // 5 seconds per image
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-r 30',
                    '-preset medium',
                    '-crf 23'
                ])
                .output(outputVideoPath)
                .on('end', () => {
                    console.log('Video creation completed!');
                    resolve(outputVideoPath);
                })
                .on('error', (err) => {
                    console.error('Error creating video:', err);
                    reject(err);
                })
                .run();
        });
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Run the script
createVideo()
    .then(videoPath => {
        console.log(`Video created successfully at: ${videoPath}`);
    })
    .catch(error => {
        console.error('Failed to create video:', error);
    }); 