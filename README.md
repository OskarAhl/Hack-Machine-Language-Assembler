### HACK MACHINE LANGUAGE ASSEMBLER
* Assembles machine language into `.hack` machine code
* Supports symbols (variables + labels)
* Written in node.js
* To learn more about hack - check out https://www.nand2tetris.org/

To use:
* node `file_name.asm`
* --> creates a new file `file_name.hack`

E.g. `add.asm`

```
// Adds 2 + 3 and puts the result into Register 0
@2
D=A
@3
D=D+A
@0
M=D
```

turns into `add.hack`:
```
0000000000000010
1110110000010000
0000000000000011
1110000010010000
0000000000000000
1110001100001000
```
