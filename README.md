<div align="center">
    <h3> Hack Machine Language Assembler</h3>
    Created by
    <a href="https://github.com/OskarAhl">Oskar Ahlroth</a>
    :christmas_tree:
</div>

---

* Assembles machine language `.asm` into `.hack` machine code
* Supports symbols (variables + labels)
* To learn more about hack - check out [ NandToTetris](https://www.nand2tetris.org/)

### Usage:

---

``` 
node file_name.asm 
```
* --> creates a new file `file_name.hack`

E.g. `add.asm`

```javascript
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

