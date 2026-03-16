const Jimp = require('jimp');

async function pad() {
    try {
        const img = await Jimp.read('c:/Users/dhruv/Assistive-Vision/public/eye.png');
        const w = img.bitmap.width;
        const h = img.bitmap.height;
        const size = Math.max(w, h);

        // Create a square image 1.8x the size so the eye looks smaller in rounded Android icons
        const newSize = Math.floor(size * 1.8);
        const out = new Jimp(newSize, newSize, 0x00000000);

        // Center it
        out.composite(img, Math.floor((newSize - w) / 2), Math.floor((newSize - h) / 2));
        await out.writeAsync('c:/Users/dhruv/Assistive-Vision/public/eye-padded.png');
        console.log('Successfully created eye-padded.png');
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

pad();
