const sharp = require('sharp');

sharp('public/eye.png')
    .metadata()
    .then(metadata => {
        const pad = Math.floor(metadata.width * 0.4);
        return sharp('public/eye.png')
            .extend({
                top: pad,
                bottom: pad,
                left: pad,
                right: pad,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile('public/eye-padded.png');
    })
    .then(() => {
        console.log('Successfully padded eye.png to eye-padded.png');
    })
    .catch(err => {
        console.error('Error with sharp:', err);
    });
