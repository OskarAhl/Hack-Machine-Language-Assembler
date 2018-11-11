// C - instruction 
// A - instruction
// { } Symbols: predefined, labels, variables

// Read file line by line --> translate to C and A

// Parsing: ignore whitespace and comments //
const readline = require('readline');
const fs = require('fs');
const file = process.argv[2];

const rl = readline.createInterface({
    input: fs.createReadStream(file),
    output: process.stdout,
    terminal: false
});

const out = file
    .split('/')
    .find((file) => file.includes('.asm'))
    .replace(/.asm/, '.hack');

fd = fs.openSync(out, 'w');

rl.on('line', (input) => {
    // console.log(`Received: ${input}`);
    fs.write(fd, input + '\n', () => {
        // console.log('object');
    });
});
