const readline = require('readline');
const fs = require('fs');
const file = process.argv[2];
const lookup_tables = require('./lookup-tables');
const { 
    C_BINARY, 
    C_A_BINARY, 
    DESTINATION_BINARY, 
    JUMP_BINARY, 
    SYMBOL_MEM_LOC 
} = lookup_tables;

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

const parse_a_instruction = init_a_parser(16);
const parse_c_instruction = init_c_parser();
const init = init_read_file();
init();

function init_read_file () {
    const all_asm = [];
    let line_count = 0;
    return function read_file() {
        rl.on('line', (asm_line) => {
            const asm_trimmed = strip_inline_comment(asm_line.trim());
            const ignore_line = should_ignore_line(asm_trimmed);
            if (ignore_line) return;
        
            const is_label = asm_trimmed.startsWith('(');
            if (is_label) {
                let symbol = asm_trimmed.slice(1, -1);
                SYMBOL_MEM_LOC[symbol] = line_count;
                return;
            }
        
            line_count += 1;
            all_asm.push(asm_trimmed);
        }).on('close', () => {
            write_file(all_asm);
        });
    }
}

async function write_file(all_asm) {
    for (const asm_line of all_asm) {
        const parsed_asm = assemble(asm_line);

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

function assemble(asm_line) {
    let hack;

    if (asm_line.startsWith('@')) hack = parse_a_instruction(asm_line);
    else hack = parse_c_instruction(asm_line);

    return hack;
};

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
    
        if (a_is_number) {
            num_to_binary = a_num;
        } else {
            let address;
            let is_new_symbol = SYMBOL_MEM_LOC[a_instruction] || SYMBOL_MEM_LOC[a_instruction] === 0;

            if (is_new_symbol) {
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

function init_c_parser() {
    const OP_CODE = '111';

    return function parse_c_instruction(asm_line) {
        const is_assignment = asm_line.includes('=');
        const is_jump = asm_line.includes(';');
        let jump_bits = '000';
        let dest_bits = '000';
        let a = 0;
        let alu_bits;

        if (is_assignment) {
            let is_m = asm_line.split('=')[1].includes('M');

            if (!is_m) alu_bits = binary_lookup({ asm_line, table: C_BINARY, sign: '=' });

            if (is_m) {
                a = 1;
                alu_bits = binary_lookup({ asm_line, table: C_A_BINARY, sign: '='});
            }
            dest_bits = binary_lookup({ asm_line, table: DESTINATION_BINARY, sign: '=', pos: 0 });
        }
        if (is_jump) {
            alu_bits = binary_lookup({ asm_line, table: C_BINARY, sign: ';', pos: 0 });
            jump_bits = binary_lookup({ asm_line, table: JUMP_BINARY, sign: ';' });
        }

        return `${OP_CODE}${a}${alu_bits}${dest_bits}${jump_bits}`;
    }
}

function binary_lookup({ asm_line, table, sign, pos = 1 }) {
    let code = asm_line.split(sign)[pos];
    return table[code];
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