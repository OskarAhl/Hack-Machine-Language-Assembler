// C - instruction 
// todo add constants to separate file - only readable
const COMP_NOT_A_BINARY = Object.freeze({
    '0': '101010',
    '1': '111111',
    '-1': '111010',
    'D': '001100',
    'A': '110000',
    '!D': '001101',
    '!A': '110001',
    '-D': '001111',
    '-A': '110011',
    'D+1': '011111',
    'A+1': '110111',
    'D-1': '001110',
    'A-1': '110010',
    'D+A': '000010',
    'D-A': '010011',
    'A-D': '000111',
    'D&A': '000000',
    'D|A': '010101',
});
// A - instruction
const COMP_A_BINARY = Object.freeze({
    'M': '110000',
    '!M': '110001',
    '-M': '110011',
    'M+1': '110111',
    'M-1': '110010',
    'D+M': '000010',
    'D-M': '010011',
    'M-D': '000111',
    'D&M': '000000',
    'D|M': '010101',  
});

const JUMP_BINARY = Object.freeze({
    'null': '000',
    'JGT': '001',
    'JEQ': '010',
    'JGE': '011',
    'JLT': '100',
    'JNE': '101',
    'JLE': '110',
    'JMP': '111',
});

const DESTINATION_BINARY = Object.freeze({
    'null': '000',
    'M': '001',
    'D': '010',
    'MD': '011',
    'A': '100',
    'AM': '101',
    'AD': '110',
    'AMD': '111',
});

// { } Symbols: predefined, labels, variables
const SYMBOL_TABLE = {
    'SP': 0,
    'LCL': 1,
    'ARG': 2,
    'THIS': 3,
    'THAT': 4,
    'R0': 0,
    'R1': 1,
    'R2': 2,
    'R3': 3,
    'R4': 4,
    'R5': 5,
    'R6': 6,
    'R7': 7,
    'R8': 8,
    'R9': 9,
    'R10': 10,
    'R11': 11,
    'R12': 12,
    'R13': 13,
    'R14': 14,
    'R15': 15,
    'SCREEN': 16384,
    'KBD': 24576,  
};

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

const outfile_name = file
    .split('/')
    .find((file) => file.includes('.asm'))
    .replace(/.asm/, '.hack');

out_file = fs.openSync(outfile_name, 'w');

const asm_parser = parse_asm();
const a_parser = init_a_parser(16);

const all_asm = [];
rl.on('line', (asm_line) => {
    const ignore_line = should_ignore_line(asm_line);
    if (ignore_line) return;
    all_asm.push(asm_line);
    // Todo: add (label) to symbol table and remove line
    const parsed_asm = asm_parser(asm_line);

    if (!parsed_asm) return;

    fs.write(out_file, parsed_asm + '\n', () => {
        // console.log('object');
    });
}).on('close', () => {
    // console.log(all_asm);
});

function parse_asm() {
    return function parse(asm_line) {
        let asm_stripped = strip_inline_comment(asm_line);
        let hack;
    
        if (asm_stripped.startsWith('@')) hack = a_parser(asm_stripped);
        else hack = parse_c_instruction(asm_stripped);
    
        return hack;
    };
}

function init_a_parser(var_address_start) {
    let variable_address = var_address_start;
    const OP_CODE = '0';

    return function parse_a_instruction(asm_line) {
        // can be variable e.g. @foo or number e.g. @34
        let a_instruction = asm_line.split('@')[1];
        let num_binary;
        let num_to_binary;
        const a_num = Number(a_instruction);
        const a_is_number = !Number.isNaN(a_num);
    
        // if number: opcode + number in binary 15
        if (a_is_number) {
            num_to_binary = a_num;
        } else {
            let address;
            // add only if new variable - else use existing address
            if (SYMBOL_TABLE[a_instruction]) {
                address = SYMBOL_TABLE[a_instruction];
            } else {
                address = variable_address;
                SYMBOL_TABLE[a_instruction] = address;
                variable_address += 1;
            }
            num_to_binary = address;
        }
        num_binary = num_to_binary.toString(2).padStart(15, '0');
        return `${OP_CODE}${num_binary}`
    }
}

function parse_c_instruction(asm_line) {
    let asm_stripped = strip_inline_comment(asm_line);
    const OP_CODE = '111';
    let jump_bits = '000';
    let dest_bits = '000';
    const is_assignment = asm_stripped.includes('=');
    const is_jump = asm_stripped.includes(';');
    let a;
    let alu_bits;

    if (is_assignment) {
        let is_m = asm_stripped.split('=')[1].includes('M');
        let is_comp = !asm_stripped.split('=')[1].includes('M');

        if (is_comp) {
            a = 0;
            alu_bits = alu_parser(asm_stripped, COMP_NOT_A_BINARY, '=');
        }
        if (is_m) {
            a = 1;
            alu_bits = alu_parser(asm_stripped, COMP_A_BINARY, '=');
        }
        dest_bits = dest_parser(asm_stripped, DESTINATION_BINARY);
        return `${OP_CODE}${a}${alu_bits}${dest_bits}${jump_bits}`;
    }
    if (is_jump) {
        a = 0;
        alu_bits = alu_parser(asm_stripped, COMP_NOT_A_BINARY, ';', 0);
        jump_bits = jump_parser(asm_stripped, JUMP_BINARY);
        return `${OP_CODE}${a}${alu_bits}${dest_bits}${jump_bits}`;
    }
    return asm_line;
}

function dest_parser(asm_stripped, dest_table) {
    const code = asm_stripped.split('=')[0];
    return dest_table[code];
}

function jump_parser(asm_stripped, jump_table) {
    const code = asm_stripped.split(';')[1];
    return jump_table[code];
}

function alu_parser(asm_stripped, alu_table, sign, pos = 1) {
    let code = asm_stripped.split(sign)[pos];
    return alu_table[code];
}

function strip_inline_comment(asm_line) {
    const has_inline_comment = asm_line.includes('//');
    if (has_inline_comment) {
        return asm_line.split('//')[0].trim();
    }
    return asm_line;
}

function should_ignore_line(asm_line) {
    return is_comment(asm_line) || asm_line === '';
}

function is_comment(asm_line) {
    const comment_re = /^\/\//;
    return comment_re.test(asm_line);
}