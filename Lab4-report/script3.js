// Windows Script Host JScript (run with cscript.exe //nologo script3.js).
var fso = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("WScript.Shell");
var dir = fso.GetParentFolderName(WScript.ScriptFullName);
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

function quote(s) { return '"' + s + '"'; }
function bridge(mode, a, op, b) {
    var req = fso.BuildPath(fso.GetSpecialFolder(2), fso.GetTempName());
    var res = fso.BuildPath(fso.GetSpecialFolder(2), fso.GetTempName());
    var file = fso.CreateTextFile(req, true, true);
    file.WriteLine(mode); file.WriteLine(String(a)); file.WriteLine(op); file.WriteLine(String(b)); file.Close();
    var code = shell.Run('powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File ' + quote(dir + '\\calculator.ps1') + ' -Request ' + quote(req) + ' -Response ' + quote(res), 0, true);
    fso.DeleteFile(req);
    if (!fso.FileExists(res)) throw new Error('PowerShell bridge failed to start');
    file = fso.OpenTextFile(res, 1, false, -1); var text = file.ReadAll(); file.Close(); fso.DeleteFile(res);
    var lines = text.split('\r\n');
    if (code !== 0 || lines[0] !== 'OK') throw new Error(text);
    var value = Number(lines[1]); if (!isFinite(value)) throw new Error('Invalid Calculator response');
    return value;
}
var choice = shell.Popup('Output base: Yes = hexadecimal, No = another base, Cancel = exit.', 0, 'Lab4 - output base', 3 + 32);
if (choice === 2) WScript.Quit(0);
var base = 16;
if (choice === 7) {
    choice = shell.Popup('Yes = decimal; No = octal/binary; Cancel = exit.', 0, 'Lab4 - output base', 3 + 32);
    if (choice === 2) WScript.Quit(0);
    if (choice === 6) base = 10;
    else {
        choice = shell.Popup('Yes = octal; No = binary; Cancel = exit.', 0, 'Lab4 - output base', 3 + 32);
        if (choice === 2) WScript.Quit(0);
        base = choice === 6 ? 8 : 2;
    }
}
var input = dir + '\\text1.txt', output = dir + '\\text2.txt';
if (!fso.FileExists(input)) { WScript.Echo('Missing text1.txt'); WScript.Quit(1); }
// Input is ASCII (expressions only), output UTF-16LE for Russian Windows compatibility.
var reader = fso.OpenTextFile(input, 1, false, 0), results = [], lineNumber = 0, failures = 0;
while (!reader.AtEndOfStream) {
    var line = reader.ReadLine(); lineNumber++;
    if (/^\s*$/.test(line)) continue;
    try {
        var tree = LabEngine.parse(line), calls = 0;
        var result = LabEngine.evaluate(tree, function(a, op, b) { calls++; return bridge('binary', a, op, b); });
        if (!calls) result = bridge('identity', result, '', 0);
        results.push(line + ' = ' + LabEngine.format(result, base).replace(/^(-?)(0x|@)/, '$1').replace(/^(-?)0(?=[0-7])/, '$1'));
    } catch (e) { failures++; results.push('Line ' + lineNumber + ': ' + line + ' -> ERROR: ' + e.message); }
}
reader.Close();
var writer = fso.CreateTextFile(output, true, true);
writer.WriteLine('Output base: ' + base);
for (var i = 0; i < results.length; i++) writer.WriteLine(results[i]);
writer.Close();
WScript.Echo('Written: ' + output + '; expressions: ' + results.length + '; errors: ' + failures);
WScript.Quit(failures ? 1 : 0);
