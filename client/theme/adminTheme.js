import colors from 'tailwindcss/colors.js';

// Keep each utility's original light color. Only the admin theme scope supplies
// these variables; public pages and certificate artwork retain their colors.
export const adminDarkVariables = {};
function channels(hex) {
  return hex.replace('#', '').match(/../g).map(value => parseInt(value, 16)).join(' ');
}
function token(role, name, light, dark) {
  const variable = `--admin-${role}-${name}`;
  adminDarkVariables[variable] = channels(dark);
  return `rgb(var(${variable}, ${channels(light)}) / <alpha-value>)`;
}
const surfaces = {
  white: token('bg', 'white', '#ffffff', '#172033'),
  canvas: token('bg', 'canvas', '#fbfbfd', '#0b1220'),
  workspace: token('bg', 'workspace', '#f8f9fa', '#0b1220'),
  'surface-header': token('bg', 'header', '#fbfcfa', '#111b2d'),
  'surface-footer': token('bg', 'footer', '#fcfdfb', '#111b2d'),
  'admin-active': token('bg', 'active', colors.slate[900], colors.red[700]),
  slate: Object.fromEntries(Object.entries({50:'#111b2d',100:'#233047',200:'#334155',300:'#475569'})
    .map(([shade, dark]) => [shade, token('bg', `slate-${shade}`, colors.slate[shade], dark)])),
};
const text = {
  ink: token('text', 'ink', colors.slate[900], colors.slate[100]),
  slate: Object.fromEntries(Object.entries({400:colors.slate[400],500:colors.slate[400],600:colors.slate[300],700:colors.slate[200],800:colors.slate[100],900:colors.slate[100],950:colors.slate[50]})
    .map(([shade, dark]) => [shade, token('text', `slate-${shade}`, colors.slate[shade], dark)])),
};
const borders = {
  slate: Object.fromEntries(Object.entries({100:'#29364b',200:'#334155',300:'#526078',400:'#64748b',900:'#94a3b8'})
    .map(([shade, dark]) => [shade, token('border', `slate-${shade}`, colors.slate[shade], dark)])),
};
for (const family of ['red', 'rose', 'amber', 'emerald', 'blue', 'purple', 'forest']) {
  const palette = colors[family === 'forest' ? 'red' : family];
  surfaces[family] = Object.fromEntries([50,100,200].map((shade, index) => [shade, token('bg', `${family}-${shade}`, palette[shade], palette[[950,900,800][index]])]));
  text[family] = Object.fromEntries([600,700,800,900,950].map(shade => [shade, token('text', `${family}-${shade}`, palette[shade], palette[300])]));
  borders[family] = Object.fromEntries([100,200,300].map(shade => [shade, token('border', `${family}-${shade}`, palette[shade], palette[800])]));
}
surfaces.gold = {100: token('bg', 'gold-100', colors.rose[100], colors.rose[950])};
for (const family of ['amber', 'emerald']) {
  surfaces[family][600] = token('bg', `${family}-600`, colors[family][600], colors[family][700]);
}

export const adminThemeColors = {
  backgroundColor: surfaces,
  textColor: text,
  borderColor: borders,
  divideColor: borders,
  placeholderColor: text,
  ringColor: text,
  ringOffsetColor: surfaces,
  gradientColorStops: surfaces,
};
