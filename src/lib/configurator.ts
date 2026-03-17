/**
 * Theme configurator panel — generates the HTML/CSS/JS for the interactive
 * theme configuration sidebar injected into the preview server.
 */

export interface ConfiguratorTheme {
  name: string;
  properties: Record<string, string>;
  description?: string | undefined;
  tags?: string[] | undefined;
}

export interface ConfiguratorOptions {
  themes: ConfiguratorTheme[];
  currentTheme: string;
  csrfToken: string;
}

/** Core color properties mapped to human-readable labels */
const CORE_COLORS: Record<string, string> = {
  '--color-accent': 'Accent',
  '--color-text': 'Text',
  '--color-text-secondary': 'Secondary',
  '--color-text-muted': 'Muted',
  '--color-background': 'Background',
  '--color-border': 'Border',
};

/**
 * Generate the complete configurator panel HTML (div + style + script).
 * Injected before </body> in the preview server.
 */
export function generateConfiguratorPanel(options: ConfiguratorOptions): string {
  const { themes, currentTheme, csrfToken } = options;

  const themesJson = JSON.stringify(themes);
  const coreColorsJson = JSON.stringify(CORE_COLORS);

  return `
<style>
.vitae-cfg {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  box-shadow: -2px 0 12px rgba(0,0,0,0.3);
  z-index: 99999;
  overflow-y: auto;
  transition: transform 0.2s ease;
  box-sizing: border-box;
}
.vitae-cfg.collapsed {
  transform: translateX(100%);
}
.vitae-cfg-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 100000;
  background: #1e1e2e;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: right 0.2s ease;
}
.vitae-cfg-toggle.panel-open {
  right: 332px;
}
.vitae-cfg-header {
  padding: 16px;
  border-bottom: 1px solid #45475a;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.vitae-cfg-section {
  padding: 12px 16px;
  border-bottom: 1px solid #313244;
}
.vitae-cfg-section h3 {
  margin: 0 0 10px 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a6adc8;
}
.vitae-cfg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.vitae-cfg-row label {
  font-size: 12px;
  color: #bac2de;
  flex-shrink: 0;
  width: 90px;
}
.vitae-cfg-row input[type="color"] {
  width: 32px;
  height: 24px;
  border: 1px solid #45475a;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}
.vitae-cfg-row input[type="text"],
.vitae-cfg-row select {
  flex: 1;
  min-width: 0;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
}
.vitae-cfg-color-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.vitae-cfg-color-group input[type="text"] {
  flex: 1;
  min-width: 0;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
.vitae-cfg-actions {
  padding: 16px;
  display: flex;
  gap: 8px;
}
.vitae-cfg-actions button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.vitae-cfg-row.modified label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #89b4fa;
  margin-right: 4px;
  vertical-align: middle;
}
.vitae-cfg-btn-export {
  background: #89b4fa;
  color: #1e1e2e;
}
.vitae-cfg-btn-export:hover { background: #74c7ec; }
.vitae-cfg-btn-reset {
  background: #45475a;
  color: #cdd6f4;
}
.vitae-cfg-btn-reset:hover { background: #585b70; }
.vitae-cfg-advanced-toggle {
  cursor: pointer;
  color: #89b4fa;
  font-size: 12px;
  padding: 8px 16px;
  display: block;
  border-bottom: 1px solid #313244;
}
.vitae-cfg-advanced-toggle:hover { color: #74c7ec; }
.vitae-cfg-advanced {
  display: none;
}
.vitae-cfg-advanced.open {
  display: block;
}
.vitae-cfg-status {
  padding: 8px 16px;
  font-size: 11px;
  color: #a6adc8;
  text-align: center;
}
.vitae-cfg-search {
  width: 100%;
  margin-bottom: 8px;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
}
.vitae-cfg-group-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c7086;
  margin: 10px 0 6px;
  padding-top: 8px;
  border-top: 1px solid #313244;
}
.vitae-cfg-group-title:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
@media print {
  .vitae-cfg, .vitae-cfg-toggle { display: none !important; }
}
</style>

<button class="vitae-cfg-toggle panel-open" id="vitaeCfgToggle" title="Toggle theme configurator (Ctrl+Shift+T)">&#9881; Theme</button>

<div class="vitae-cfg" id="vitaeCfgPanel">
  <div class="vitae-cfg-header">&#9881; Theme Configurator</div>

  <div class="vitae-cfg-section">
    <h3>Theme</h3>
    <div class="vitae-cfg-row">
      <select id="vitaeCfgTheme" style="width:100%"></select>
    </div>
    <div id="vitaeCfgThemeTags" style="font-size:10px;color:#6c7086;margin-top:4px"></div>
  </div>

  <div class="vitae-cfg-section" id="vitaeCfgColors">
    <h3>Colors</h3>
  </div>

  <div class="vitae-cfg-section" id="vitaeCfgFonts">
    <h3>Fonts</h3>
  </div>

  <div class="vitae-cfg-advanced-toggle" id="vitaeCfgAdvToggle">&#9654; Advanced</div>
  <div class="vitae-cfg-advanced" id="vitaeCfgAdvanced">
    <div class="vitae-cfg-section" id="vitaeCfgAdvProps">
      <h3>All CSS Properties</h3>
    </div>
  </div>

  <div class="vitae-cfg-actions">
    <button class="vitae-cfg-btn-export" id="vitaeCfgExport">Export to YAML</button>
    <button class="vitae-cfg-btn-reset" id="vitaeCfgReset">Reset</button>
  </div>

  <div class="vitae-cfg-status" id="vitaeCfgStatus"></div>
</div>

<script>
(function() {
  const THEMES = ${themesJson};
  const CORE_COLORS = ${coreColorsJson};
  const CSRF = ${JSON.stringify(csrfToken)};
  let currentTheme = ${JSON.stringify(currentTheme)};
  let defaults = {};
  const modified = {};

  /** Detected font-family property names for the current theme (dynamic, not hardcoded) */
  let fontFamilyKeys = [];

  const panel = document.getElementById('vitaeCfgPanel');
  const toggle = document.getElementById('vitaeCfgToggle');
  const status = document.getElementById('vitaeCfgStatus');

  // --- Toggle panel ---
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.classList.toggle('panel-open');
    document.body.style.marginRight = panel.classList.contains('collapsed') ? '' : '320px';
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggle.click();
    }
  });

  // Adjust body margin for panel
  document.body.style.marginRight = '320px';
  document.body.style.transition = 'margin-right 0.2s ease';

  // --- Theme selector ---
  const themeSelect = document.getElementById('vitaeCfgTheme');
  THEMES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name + (t.description ? ' \\u2014 ' + t.description : '');
    if (t.name === currentTheme) opt.selected = true;
    themeSelect.appendChild(opt);
  });

  function updateThemeTags() {
    const tagsEl = document.getElementById('vitaeCfgThemeTags');
    const theme = THEMES.find(t => t.name === currentTheme);
    if (theme && theme.tags && theme.tags.length > 0) {
      tagsEl.textContent = 'Tags: ' + theme.tags.join(', ');
    } else {
      tagsEl.textContent = '';
    }
  }
  updateThemeTags();

  themeSelect.addEventListener('change', () => {
    const name = themeSelect.value;
    if (Object.keys(modified).length > 0) {
      if (!confirm('Unsaved changes will be lost. Switch theme?')) {
        themeSelect.value = currentTheme;
        return;
      }
    }
    fetch('/__vitae_api/switch?theme=' + encodeURIComponent(name))
      .then(() => { /* SSE reload will handle it */ })
      .catch(err => showStatus('Switch failed: ' + err.message, true));
  });

  // --- Color and value detection utilities ---

  function toHex6(color) {
    if (!color) return '#000000';
    const c = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) return '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3];
    // Try to use a temporary element to convert named/rgb/hsl colors
    try {
      const tmp = document.createElement('div');
      tmp.style.color = c;
      document.body.appendChild(tmp);
      const computed = getComputedStyle(tmp).color;
      document.body.removeChild(tmp);
      const m = computed.match(/rgb\\w*\\(\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (m) return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
    } catch(e) {}
    return '#000000';
  }

  function isColorValue(val) {
    const v = val.trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(rgb|hsl)a?\\(/.test(v);
  }

  function isHexColor(val) {
    return /^#[0-9a-fA-F]{3,8}$/.test(val.trim());
  }

  // --- Populate controls ---
  function init() {
    const theme = THEMES.find(t => t.name === currentTheme);
    if (!theme) return;
    defaults = { ...theme.properties };

    // Detect font-family properties dynamically
    fontFamilyKeys = Object.keys(theme.properties).filter(k =>
      k.startsWith('--font-') && !k.startsWith('--font-size') && !k.startsWith('--font-weight') && !k.startsWith('--line-height')
    );

    buildColors(theme.properties);
    buildFonts(theme.properties);
    buildAdvanced(theme.properties);
    updateThemeTags();

    restoreFromStorage();
  }

  function buildColorRow(container, varName, label, val) {
    const row = document.createElement('div');
    row.className = 'vitae-cfg-row';

    if (isHexColor(val)) {
      // Hex color: show color picker + text input
      row.innerHTML =
        '<label>' + label + '</label>' +
        '<div class="vitae-cfg-color-group">' +
          '<input type="color" value="' + toHex6(val) + '" data-var="' + varName + '">' +
          '<input type="text" value="' + val + '" data-var="' + varName + '">' +
        '</div>';
      container.appendChild(row);

      const colorInput = row.querySelector('input[type="color"]');
      const textInput = row.querySelector('input[type="text"]');
      colorInput.addEventListener('input', () => {
        textInput.value = colorInput.value;
        applyVar(varName, colorInput.value);
      });
      textInput.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{3,6}$/.test(textInput.value.trim())) {
          colorInput.value = toHex6(textInput.value);
          applyVar(varName, textInput.value);
        }
      });
    } else {
      // Non-hex color (rgb, hsl, etc.): show text input only
      row.innerHTML =
        '<label>' + label + '</label>' +
        '<div class="vitae-cfg-color-group">' +
          '<input type="text" value="' + val + '" data-var="' + varName + '" style="width:100%">' +
        '</div>';
      container.appendChild(row);

      const textInput = row.querySelector('input[type="text"]');
      textInput.addEventListener('input', () => {
        applyVar(varName, textInput.value);
      });
    }

    return row;
  }

  function buildColors(props) {
    const container = document.getElementById('vitaeCfgColors');
    container.innerHTML = '<h3>Colors</h3>';
    for (const [varName, label] of Object.entries(CORE_COLORS)) {
      const val = getComputedValue(varName) || props[varName] || '#000000';
      buildColorRow(container, varName, label, val);
    }
  }

  function buildFonts(props) {
    const container = document.getElementById('vitaeCfgFonts');
    container.innerHTML = '<h3>Fonts</h3>';
    const fontOptions = [
      'system-ui, -apple-system, sans-serif',
      '"Inter", system-ui, sans-serif',
      '"Roboto", system-ui, sans-serif',
      '"Montserrat", system-ui, sans-serif',
      '"Lato", system-ui, sans-serif',
      '"Helvetica Neue", Arial, sans-serif',
      'Georgia, "Times New Roman", serif',
      '"Libre Baskerville", Georgia, serif',
      '"Playfair Display", Georgia, serif',
      '"Cormorant Garamond", Garamond, serif',
      '"Palatino Linotype", Palatino, serif',
      '"Fira Code", "Fira Mono", monospace',
      '"JetBrains Mono", "Cascadia Code", monospace',
      '"Courier New", Courier, monospace',
    ];

    fontFamilyKeys.forEach(varName => {
      if (!props[varName]) return;
      const val = getComputedValue(varName) || props[varName];
      const label = varName.replace('--font-', '').charAt(0).toUpperCase() + varName.replace('--font-', '').slice(1);
      const row = document.createElement('div');
      row.className = 'vitae-cfg-row';
      let optionsHtml = '<option value="">Theme default</option>';
      fontOptions.forEach(f => {
        const selected = val.trim().startsWith(f.split(',')[0]) ? ' selected' : '';
        optionsHtml += '<option value="' + f + '"' + selected + '>' + f.split(',')[0].replace(/"/g, '') + '</option>';
      });
      row.innerHTML = '<label>' + label + '</label><select data-var="' + varName + '">' + optionsHtml + '</select>';
      container.appendChild(row);
      row.querySelector('select').addEventListener('change', (e) => {
        if (e.target.value) applyVar(varName, e.target.value);
        else removeVar(varName);
      });
    });
  }

  function buildAdvanced(props) {
    const container = document.getElementById('vitaeCfgAdvProps');
    container.innerHTML = '<h3>All CSS Properties</h3>';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'vitaeCfgSearch';
    searchInput.placeholder = 'Filter properties...';
    searchInput.className = 'vitae-cfg-search';
    container.appendChild(searchInput);

    const coreSet = new Set([...Object.keys(CORE_COLORS), ...fontFamilyKeys]);
    const advancedProps = Object.entries(props).filter(([k]) => !coreSet.has(k));

    if (advancedProps.length === 0) {
      container.appendChild(Object.assign(document.createElement('div'), {
        style: 'color:#6c7086;font-size:11px',
        textContent: 'No additional properties',
      }));
      return;
    }

    // Group properties by category
    const groups = {
      'Colors': [],
      'Typography': [],
      'Spacing': [],
      'Layout': [],
      'Other': [],
    };

    advancedProps.forEach(([varName, val]) => {
      if (varName.startsWith('--color-')) groups['Colors'].push([varName, val]);
      else if (varName.startsWith('--font-') || varName.startsWith('--line-height')) groups['Typography'].push([varName, val]);
      else if (varName.startsWith('--space-')) groups['Spacing'].push([varName, val]);
      else if (varName.match(/--sidebar|--grid|--timeline/)) groups['Layout'].push([varName, val]);
      else groups['Other'].push([varName, val]);
    });

    let isFirstGroup = true;
    for (const [groupName, items] of Object.entries(groups)) {
      if (items.length === 0) continue;

      const groupTitle = document.createElement('div');
      groupTitle.className = 'vitae-cfg-group-title';
      if (isFirstGroup) {
        isFirstGroup = false;
      }
      groupTitle.textContent = groupName;
      groupTitle.setAttribute('data-group', groupName);
      container.appendChild(groupTitle);

      items.forEach(([varName, defaultVal]) => {
        const val = getComputedValue(varName) || defaultVal;
        const isColor = isColorValue(val);
        const row = document.createElement('div');
        row.className = 'vitae-cfg-row';
        row.setAttribute('data-group', groupName);

        const labelHtml =
          '<label title="' + varName + '" style="width:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-family:monospace">' +
            varName.replace('--', '') +
          '</label>';

        if (isColor) {
          if (isHexColor(val)) {
            // Hex color: color picker + text
            row.innerHTML = labelHtml +
              '<div class="vitae-cfg-color-group">' +
                '<input type="color" value="' + toHex6(val) + '" data-var="' + varName + '">' +
                '<input type="text" value="' + val + '" data-var="' + varName + '">' +
              '</div>';
            container.appendChild(row);
            const colorInput = row.querySelector('input[type="color"]');
            const textInput = row.querySelector('input[type="text"]');
            colorInput.addEventListener('input', () => {
              textInput.value = colorInput.value;
              applyVar(varName, colorInput.value);
            });
            textInput.addEventListener('input', () => {
              if (/^#[0-9a-fA-F]{3,6}$/.test(textInput.value.trim())) {
                colorInput.value = toHex6(textInput.value);
                applyVar(varName, textInput.value);
              }
            });
          } else {
            // Non-hex color (rgb, hsl, etc.): text input only
            row.innerHTML = labelHtml +
              '<div class="vitae-cfg-color-group">' +
                '<input type="text" value="' + val + '" data-var="' + varName + '" style="width:100%">' +
              '</div>';
            container.appendChild(row);
            const textInput = row.querySelector('input[type="text"]');
            textInput.addEventListener('input', () => {
              applyVar(varName, textInput.value);
            });
          }
        } else {
          row.innerHTML = labelHtml +
            '<input type="text" value="' + val + '" data-var="' + varName + '">';
          container.appendChild(row);
          row.querySelector('input[type="text"]').addEventListener('input', (e) => {
            applyVar(varName, e.target.value);
          });
        }
      });
    }

    // Search filter handler
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      container.querySelectorAll('.vitae-cfg-row').forEach(row => {
        const label = row.querySelector('label');
        const labelText = label ? label.textContent.toLowerCase() : '';
        row.style.display = labelText.includes(query) ? '' : 'none';
      });
      // Show/hide group headings based on whether they have visible rows
      container.querySelectorAll('.vitae-cfg-group-title').forEach(title => {
        const groupName = title.getAttribute('data-group');
        const rows = container.querySelectorAll('.vitae-cfg-row[data-group="' + groupName + '"]');
        let anyVisible = false;
        rows.forEach(r => {
          if (r.style.display !== 'none') anyVisible = true;
        });
        title.style.display = anyVisible ? '' : 'none';
      });
    });
  }

  // --- Advanced toggle ---
  document.getElementById('vitaeCfgAdvToggle').addEventListener('click', () => {
    const adv = document.getElementById('vitaeCfgAdvanced');
    const tog = document.getElementById('vitaeCfgAdvToggle');
    adv.classList.toggle('open');
    tog.innerHTML = adv.classList.contains('open') ? '&#9660; Advanced' : '&#9654; Advanced';
  });

  // --- Apply / remove CSS var ---
  function applyVar(name, value) {
    document.documentElement.style.setProperty(name, value);
    modified[name] = value;
    markModified(name, true);
    saveToStorage();
  }

  function removeVar(name) {
    document.documentElement.style.removeProperty(name);
    delete modified[name];
    markModified(name, false);
    saveToStorage();
  }

  function markModified(varName, isModified) {
    const row = panel.querySelector('[data-var="' + varName + '"]');
    if (row) {
      const r = row.closest('.vitae-cfg-row');
      if (r) r.classList.toggle('modified', isModified);
    }
  }

  function getComputedValue(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // --- localStorage persistence ---
  function getStorageKey() {
    return 'vitae-cfg-' + currentTheme;
  }

  function saveToStorage() {
    try {
      if (Object.keys(modified).length > 0) {
        localStorage.setItem(getStorageKey(), JSON.stringify(modified));
      } else {
        localStorage.removeItem(getStorageKey());
      }
    } catch(e) {}
  }

  function restoreFromStorage() {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const data = JSON.parse(saved);
        for (const [k, v] of Object.entries(data)) {
          applyVar(k, v);
        }
        showStatus('Restored ' + Object.keys(data).length + ' unsaved changes');
      }
    } catch(e) {}
  }

  function clearStorage() {
    try {
      localStorage.removeItem(getStorageKey());
    } catch(e) {}
  }

  window.addEventListener('beforeunload', saveToStorage);

  // --- Export ---
  document.getElementById('vitaeCfgExport').addEventListener('click', () => {
    if (Object.keys(modified).length === 0) {
      showStatus('No changes to export');
      return;
    }
    const coreColorKeys = Object.keys(CORE_COLORS);
    const colors = {};
    const fonts = {};
    const custom = {};

    for (const [k, v] of Object.entries(modified)) {
      if (coreColorKeys.includes(k)) {
        const name = k.replace('--color-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        colors[name] = v;
      } else if (fontFamilyKeys.includes(k)) {
        const name = k.replace('--font-', '');
        fonts[name] = v;
      } else {
        custom[k] = v;
      }
    }

    const payload = {};
    if (Object.keys(colors).length > 0) payload.colors = colors;
    if (Object.keys(fonts).length > 0) payload.fonts = fonts;
    if (Object.keys(custom).length > 0) payload.custom = custom;

    fetch('/__vitae_api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Vitae-Token': CSRF },
      body: JSON.stringify(payload),
    })
    .then(r => {
      if (!r.ok) throw new Error('Export failed: ' + r.status);
      return r.json();
    })
    .then(() => {
      showStatus('Exported to resume.yaml');
      Object.keys(modified).forEach(k => delete modified[k]);
      clearStorage();
    })
    .catch(err => showStatus(err.message, true));
  });

  // --- Reset ---
  document.getElementById('vitaeCfgReset').addEventListener('click', () => {
    Object.keys(modified).forEach(k => {
      document.documentElement.style.removeProperty(k);
      markModified(k, false);
    });
    Object.keys(modified).forEach(k => delete modified[k]);
    clearStorage();
    init();
    showStatus('Reset to theme defaults');
  });

  function showStatus(msg, isError) {
    status.textContent = msg;
    status.style.color = isError ? '#f38ba8' : '#a6e3a1';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }

  init();
})();
</script>`;
}
