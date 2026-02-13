const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const SCREENSHOT_DIR = path.join(__dirname, '../public/screenshots');

// Ensure directory exists
async function ensureDir() {
    try {
        await fs.access(SCREENSHOT_DIR);
    } catch {
        await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    }
}

/**
 * Saves a base64 image to disk and returns the filename
 * @param {string} base64Data 
 * @returns {Promise<string>} filename
 */
async function saveBase64Image(base64Data) {
    if (!base64Data) return null;

    await ensureDir();

    // Remove header if present
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Image, 'base64');

    // Use MD5 hash as filename to avoid duplicates
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const filename = `${hash}.png`;
    const fullPath = path.join(SCREENSHOT_DIR, filename);

    try {
        await fs.access(fullPath);
        // File already exists, no need to write again
    } catch {
        await fs.writeFile(fullPath, buffer);
    }

    return filename;
}

/**
 * Process a test result object, replacing base64 screenshots with file paths
 * @param {Object} result 
 * @returns {Promise<Object>} processed result
 */
async function processScreenshots(result) {
    if (!result) return result;
    const processed = { ...result };

    // Process main screenshot
    if (processed.screenshot && processed.screenshot.length > 100) {
        processed.screenshotPath = await saveBase64Image(processed.screenshot);
        delete processed.screenshot;
    }

    // Process steps screenshots
    if (processed.steps && Array.isArray(processed.steps)) {
        processed.steps = await Promise.all(processed.steps.map(async (step) => {
            const newStep = { ...step };
            if (newStep.detail && newStep.detail.screenshot && newStep.detail.screenshot.length > 100) {
                newStep.detail = { ...newStep.detail };
                newStep.detail.screenshotPath = await saveBase64Image(newStep.detail.screenshot);
                delete newStep.detail.screenshot;
            }
            return newStep;
        }));
    }

    return processed;
}

module.exports = {
    saveBase64Image,
    processScreenshots,
    SCREENSHOT_DIR
};
