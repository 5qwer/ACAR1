var fs = require('fs');
var lines = fs.readFileSync('smoke-test.js', 'utf8').split('\n');
if (!(String(lines[531]).indexOf('exportGrid .export-item') > -1 && String(lines[533]).indexOf('data-kind=\"xlsx\"') > -1)) { console.log('المواقع الشاذة'); process.exit(1); }
lines[531] = "  ok('شبكة التصدير فيها 7 خانات (المخازن الجديدة منهم)', $$('#exportGrid .export-item').length === 7,";
lines[533] = "     $$('#exportGrid [data-kind=\"xlsx\"]').length === 7 && $$('#exportGrid [data-kind=\"pdf\"]').length === 7);";
fs.writeFileSync('smoke-test.js', lines.join('\n'));
console.log('OK smoke fixed');
