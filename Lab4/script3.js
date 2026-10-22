// Windows Script Host JScript (run with cscript.exe //nologo script3.js).
var fso = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("WScript.Shell");
var dir = fso.GetParentFolderName(WScript.ScriptFullName);
var source = fso.OpenTextFile(dir + "\\engine.js", 1, false, 0);
eval(source.ReadAll()); source.Close(); // Loads our local engine, never an input expression.
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
        results.push(line + ' = ' + LabEngine.format(result, base));
    } catch (e) { failures++; results.push('Line ' + lineNumber + ': ' + line + ' -> ERROR: ' + e.message); }
}
reader.Close();
var writer = fso.CreateTextFile(output, true, true);
writer.WriteLine('Output base: ' + base);
for (var i = 0; i < results.length; i++) writer.WriteLine(results[i]);
writer.Close();
WScript.Echo('Written: ' + output + '; expressions: ' + results.length + '; errors: ' + failures);
WScript.Quit(failures ? 1 : 0);
