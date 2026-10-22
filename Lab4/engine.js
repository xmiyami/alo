/* ES3: Windows Script Host JScript + Node.js test runner. No eval(). */
(function (root) {
    function fail(s) { throw new Error(s); }
    function parse(source) {
        var pos = 0, count = 0;
        if (source.length > 2000) fail("Expression exceeds 2000 characters");
        function ws() { while (/\s/.test(source.charAt(pos)) && pos < source.length) pos++; }
        function number() {
            ws(); var start = pos, base = 10, prefix = "";
            if (source.substr(pos, 2).toLowerCase() === "0x") { base = 16; pos += 2; prefix = "0x"; }
            else if (source.charAt(pos) === "@") { base = 2; pos++; prefix = "@"; }
            else if (source.charAt(pos) === "0" && /[0-9]/.test(source.charAt(pos + 1)) && pos + 1 < source.length) base = 8;
            var digits = "", dots = 0;
            while (pos < source.length && /[0-9a-fA-F.]/.test(source.charAt(pos))) {
                var c = source.charAt(pos++); if (c === ".") dots++;
                else if (parseInt(c, 16) >= base) fail("Invalid digit for base " + base + " at " + pos);
                digits += c;
            }
            if (!digits || digits === "." || dots > 1) fail("Invalid number at " + (start + 1));
            var parts = digits.split("."), n = 0, i, scale = base;
            for (i = 0; i < parts[0].length; i++) n = n * base + parseInt(parts[0].charAt(i), 16);
            if (parts.length > 1) for (i = 0; i < parts[1].length; i++) { n += parseInt(parts[1].charAt(i), 16) / scale; scale *= base; }
            if (!isFinite(n) || Math.abs(n) > 9007199254740991) fail("Number exceeds safe numeric range");
            return {kind: "number", value: n};
        }
        function atom(depth) {
            if (depth > 64 || ++count > 500) fail("Expression too complex");
            ws(); var c = source.charAt(pos), a;
            if (c === "+" || c === "-") { pos++; return {kind: "unary", op: c, child: atom(depth + 1)}; }
            if (c === "(") { pos++; a = expr(depth + 1); ws(); if (source.charAt(pos++) !== ")") fail("Missing closing parenthesis"); return a; }
            return number();
        }
        function term(depth) { var a = atom(depth), c; ws(); while ((c = source.charAt(pos)) === "*" || c === "/") { pos++; a = {kind:"binary", op:c, left:a, right:atom(depth)}; ws(); } return a; }
        function expr(depth) { var a = term(depth), c; ws(); while ((c = source.charAt(pos)) === "+" || c === "-") { pos++; a = {kind:"binary", op:c, left:a, right:term(depth)}; ws(); } return a; }
        var tree = expr(0); ws(); if (pos !== source.length) fail("Unexpected character at " + (pos + 1)); return tree;
    }
    function evaluate(tree, calculator) {
        if (tree.kind === "number") return tree.value;
        if (tree.kind === "unary") return (tree.op === "-" ? -1 : 1) * evaluate(tree.child, calculator);
        var a = evaluate(tree.left, calculator), b = evaluate(tree.right, calculator);
        if (tree.op === "/" && b === 0) fail("Division by zero");
        var n = calculator(a, tree.op, b);
        if (!isFinite(n) || Math.abs(n) > 9007199254740991) fail("Result exceeds safe numeric range");
        return n;
    }
    function format(n, base) {
        if (base !== 2 && base !== 8 && base !== 10 && base !== 16) fail("Unsupported base");
        if (!isFinite(n) || Math.abs(n) > 9007199254740991) fail("Result exceeds safe numeric range");
        var sign = n < 0 ? "-" : "", x = Math.abs(n), whole = Math.floor(x), fraction = x - whole;
        var text = whole.toString(base).toUpperCase(), tail = "", i, d;
        for (i = 0; i < 12 && fraction > 0; i++) { fraction *= base; d = Math.floor(fraction); tail += d.toString(base).toUpperCase(); fraction -= d; }
        tail = tail.replace(/0+$/, "");
        return sign + (base === 16 ? "0x" : base === 8 ? "0" : base === 2 ? "@" : "") + text + (tail ? "." + tail : "") + (fraction > 0 ? " [truncated]" : "");
    }
    var api = {parse:parse, evaluate:evaluate, format:format};
    if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LabEngine = api;
}(this));
