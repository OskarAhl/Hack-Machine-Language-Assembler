const readline = require('readline');
const fs = require('fs');
const file = process.argv[2];
const binary_tables = require('./binary-lookup-tables');
const { 
    C_BINARY, 
    C_A_BINARY, 
    DESTINATION_BINARY, 
    JUMP_BINARY, 
    SYMBOL_MEM_LOC 
} = binary_tables;

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
let line_count = 0;
rl.on('line', (asm_line) => {
    const asm_trimmed = asm_line.trim();
    const ignore_line = should_ignore_line(asm_trimmed);
    if (ignore_line) return;

    if (asm_trimmed.startsWith('(')) {
        let test = strip_inline_comment(asm_trimmed).slice(1, -1);
        SYMBOL_MEM_LOC[test] = line_count;
        return;
    }

    line_count += 1;
    all_asm.push(asm_trimmed);
}).on('close', () => {
    write_file(all_asm);
});

async function write_file(all_asm) {
    for (const asm_line of all_asm) {
        const parsed_asm = asm_parser(asm_line);
        try {
            await write_line(parsed_asm);
        } catch(e) {
            console.log(`error writing parsed asm: ${e}`);
        }
    }
}

function write_line(parsed_asm) {
    return new Promise((resolve, reject) => {
        fs.write(out_file, `${parsed_asm}\n`, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
}

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
            if (SYMBOL_MEM_LOC[a_instruction] || SYMBOL_MEM_LOC[a_instruction] === 0) {
                address = SYMBOL_MEM_LOC[a_instruction];
            } else {
                address = variable_address;
                SYMBOL_MEM_LOC[a_instruction] = address;
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
            alu_bits = alu_parser(asm_stripped, C_BINARY, '=');
        }
        if (is_m) {
            a = 1;
            alu_bits = alu_parser(asm_stripped, C_A_BINARY, '=');
        }
        dest_bits = dest_parser(asm_stripped, DESTINATION_BINARY);
        return `${OP_CODE}${a}${alu_bits}${dest_bits}${jump_bits}`;
    }
    if (is_jump) {
        a = 0;
        alu_bits = alu_parser(asm_stripped, C_BINARY, ';', 0);
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