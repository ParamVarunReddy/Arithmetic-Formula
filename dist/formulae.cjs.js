'use strict';

/* formulaeArithmetic.js
 * Class-based JS library to parse and evaluate arithmetic expressions
 * with Excel-style functions (ADD, SUBTRACT, MULTIPLY, DIVIDE, MOD, POWER)
 * supports variadic ADD and MULTIPLY (n arguments) and nested calls
 * using BODMAS and nested calls support.
 */
class FormulaArithmetic {
    constructor() {
        this.operators = {
            '+': { precedence: 1, associativity: 'L', exec: (a, b) => a + b },
            '-': { precedence: 1, associativity: 'L', exec: (a, b) => a - b },
            '*': { precedence: 2, associativity: 'L', exec: (a, b) => a * b },
            '/': { precedence: 2, associativity: 'L', exec: (a, b) => a / b },
            '%': { precedence: 2, associativity: 'L', exec: (a, b) => a % b },
            '^': { precedence: 3, associativity: 'R', exec: (a, b) => Math.pow(a, b) }
        };
        this.fnNames = ['ADD','SUBTRACT','MULTIPLY','DIVIDE','MOD','POWER'];
        // Functions that support variable args
        this.variadic = new Set(['ADD','MULTIPLY','SUBTRACT']);
    }

    // Replace one outermost function call
    _replaceOnce(expr) {
        const regex = new RegExp(`\\b(${this.fnNames.join('|')})\\s*\\(`, 'i');
        const m = regex.exec(expr);
        if (!m) return null;
        const name = m[1].toUpperCase();
        // find matching parentheses
        let pos = m.index + name.length;
        pos = expr.indexOf('(', pos);
        let lvl = 1, i = pos + 1;
        for (; i < expr.length; i++) {
            if (expr[i] === '(') lvl++;
            else if (expr[i] === ')') {
                if (--lvl === 0) break;
            }
        }
        if (lvl !== 0) throw new Error('Mismatched parentheses in ' + name);
        const inside = expr.slice(pos + 1, i);
        // split top-level args
        const args = [];
        let buf = '', depth = 0;
        for (const ch of inside) {
            if (ch === '(') { depth++; buf += ch; }
            else if (ch === ')') { depth--; buf += ch; }
            else if (ch === ',' && depth === 0) { args.push(buf.trim()); buf = ''; }
            else buf += ch;
        }
        if (buf.trim()) args.push(buf.trim());
        // determine operator
        const opMap = { ADD:'+', SUBTRACT:'-', MULTIPLY:'*', DIVIDE:'/', MOD:'%', POWER:'^' };
        const op = opMap[name];
        if (!op) throw new Error('Unknown function ' + name);
        // build replacement
        let replacement;
        if (this.variadic.has(name)) {
            if (args.length < 2) throw new Error(name + ' requires at least 2 args');
            replacement = '(' + args.join(op) + ')';
        } else {
            if (args.length !== 2) throw new Error(name + ' requires exactly 2 args');
            replacement = `(${args[0]}${op}${args[1]})`;
        }
        return expr.slice(0, m.index) + replacement + expr.slice(i + 1);
    }

    // Iteratively replace all functions
    preprocess(expr) {
        let prev, cur = expr;
        do {
            prev = cur;
            const rep = this._replaceOnce(cur);
            if (rep === null) break;
            cur = rep;
        } while (cur !== prev);
        return cur;
    }

    // Tokenize into numbers/operators/parentheses
    tokenize(expr) {
        const tokens = [], len = expr.length;
        let i = 0;
        while (i < len) {
            const ch = expr[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (/[0-9\.]/.test(ch)) {
                let num = '';
                while (i < len && /[0-9\.]/.test(expr[i])) num += expr[i++];
                tokens.push({ type:'Number', value: parseFloat(num) });
            } else if (this.operators[ch]) {
                tokens.push({ type:'Operator', value: ch }); i++;
            } else if (ch==='('||ch===')') {
                tokens.push({ type:'Parenthesis', value: ch }); i++;
            } else throw new Error(`Invalid char "${ch}"`);
        }
        return tokens;
    }

    // Convert infix tokens to RPN
    toRPN(tokens) {
        const out = [], stk = [];
        for (const t of tokens) {
            if (t.type==='Number') out.push(t);
            else if (t.type==='Operator') {
                const o1 = this.operators[t.value];
                while (stk.length) {
                    const top = stk[stk.length-1];
                    if (top.type!=='Operator') break;
                    const o2 = this.operators[top.value];
                    if ((o1.associativity==='L'&&o1.precedence<=o2.precedence)||
                        (o1.associativity==='R'&&o1.precedence< o2.precedence)) out.push(stk.pop());
                    else break;
                }
                stk.push(t);
            } else if (t.type==='Parenthesis') {
                if (t.value==='(') stk.push(t);
                else {
                    let found=false;
                    while (stk.length) {
                        const top=stk.pop();
                        if (top.type==='Parenthesis'&&top.value==='('){found=true;break;}
                        out.push(top);
                    }
                    if(!found) throw new Error('Mismatched parentheses');
                }
            }
        }
        while(stk.length){
            const t=stk.pop(); if(t.type==='Parenthesis') throw new Error('Mismatched parentheses'); out.push(t);
        }
        return out;
    }

    // Evaluate RPN array
    evalRPN(rpn) {
        const stk=[];
        for(const t of rpn) {
            if(t.type==='Number') stk.push(t.value);
            else {
                const b=stk.pop(), a=stk.pop();
                stk.push(this.operators[t.value].exec(a,b));
            }
        }
        if(stk.length!==1) throw new Error('Invalid evaluation');
        return stk[0];
    }

    // Evaluate an expression string
    evaluate(expr) {
        const fns = this.preprocess(expr);
        const tokens = this.tokenize(fns);
        const rpn = this.toRPN(tokens);
        return this.evalRPN(rpn);
    }
}

module.exports = FormulaArithmetic;
